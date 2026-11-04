using System;
using System.Threading.Tasks;
using Xunit;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Jewellery;

namespace UdyogBill.UnitTests.Jewellery;

public class JewelleryCalculationTests
{
    [Fact]
    public void Test_PreciousGold22K_ZeroPercentError_Calculation()
    {
        // 15.500g Gross, 0.500g Stone, Net = 15.000g
        decimal grossWeight = 15.500m;
        decimal stoneWeight = 0.500m;
        decimal netWeight = grossWeight - stoneWeight;
        Assert.Equal(15.000m, netWeight);

        // 4% Wastage = 15.000 * 0.04 = 0.600g
        decimal wastagePct = 4.00m;
        decimal wastageGrams = Math.Round(netWeight * (wastagePct / 100m), 3, MidpointRounding.AwayFromZero);
        Assert.Equal(0.600m, wastageGrams);

        // Billable weight = 15.600g
        decimal billableWeight = netWeight + wastageGrams;
        Assert.Equal(15.600m, billableWeight);

        // Gold Rate ₹70,000 per 10g => ₹7,000 per 1g
        decimal ratePer10g = 70000m;
        decimal ratePerGram = ratePer10g / 10m;
        decimal metalValue = Math.Round(billableWeight * ratePerGram, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(109200.00m, metalValue);

        // Making Charges @ ₹600 / Gross Gram => 15.500 * 600 = ₹9,300.00
        decimal makingRate = 600m;
        decimal makingCharges = Math.Round(grossWeight * makingRate, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(9300.00m, makingCharges);

        // Taxable Amount = 109,200 + 9,300 = ₹118,500.00
        decimal taxable = metalValue + makingCharges;
        Assert.Equal(118500.00m, taxable);

        // Mandatory GST on Jewellery in India: 3.00% (1.5% CGST + 1.5% SGST)
        decimal gstRate = 3.00m;
        decimal gstAmount = Math.Round(taxable * (gstRate / 100m), 2, MidpointRounding.AwayFromZero);
        Assert.Equal(3555.00m, gstAmount);

        // Grand Total = ₹122,055.00
        decimal grandTotal = taxable + gstAmount;
        Assert.Equal(122055.00m, grandTotal);

        // Fine Gold 24K equivalent (for stock reconciliation): 15.000 * 91.6% = 13.740g
        decimal fineGoldEqv = Math.Round(netWeight * (91.60m / 100m), 3, MidpointRounding.AwayFromZero);
        Assert.Equal(13.740m, fineGoldEqv);
    }

    [Fact]
    public void Test_OldGoldExchange_PureEquivalent_Valuation()
    {
        // Customer gives 20.000g old ornament with 2.000g stones/lac/dirt
        decimal grossWeight = 20.000m;
        decimal dustStoneWeight = 2.000m;
        decimal netWeight = grossWeight - dustStoneWeight;
        Assert.Equal(18.000m, netWeight);

        // XRF Karattometer test shows 85.00% purity (Tunch)
        decimal purityTunch = 85.00m;
        decimal pureEquivalent = Math.Round(netWeight * (purityTunch / 100m), 3, MidpointRounding.AwayFromZero);
        Assert.Equal(15.300m, pureEquivalent);

        // Store 24K old gold buying rate = ₹7,200 per gram
        decimal buyingRatePerGram = 7200m;
        decimal exchangeValuation = Math.Round(pureEquivalent * buyingRatePerGram, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(110160.00m, exchangeValuation);
    }

    [Fact]
    public void Test_ImitationFashionJewellery_FixedPrice_Calculation()
    {
        // 5 Pieces of Bridal Kundan Set @ ₹1,500 per piece
        decimal piecePrice = 1500.00m;
        decimal quantity = 5m;
        decimal taxable = piecePrice * quantity;
        Assert.Equal(7500.00m, taxable);

        // 3% GST on Imitation Jewellery = ₹225.00
        decimal gst = Math.Round(taxable * 0.03m, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(225.00m, gst);

        // Grand total = ₹7,725.00
        decimal total = taxable + gst;
        Assert.Equal(7725.00m, total);
    }

    [Fact]
    public void Test_Karigar_DoubleEntry_MetalBalance()
    {
        // Jeweller issues 50.000g 24K raw gold to Karigar
        decimal initialBalance = 0m;
        decimal issuedGold = 50.000m;
        decimal currentLiability = initialBalance + issuedGold;
        Assert.Equal(50.000m, currentLiability);

        // Karigar returns 52.000g ornaments at 84.0% purity (fine = 43.680g)
        decimal receivedNet = 52.000m;
        decimal purity = 84.00m;
        decimal fineReturned = Math.Round(receivedNet * (purity / 100m), 3, MidpointRounding.AwayFromZero);
        Assert.Equal(43.680m, fineReturned);

        // Allowed melting & filing wastage = 1.200g
        decimal allowedWastage = 1.200m;
        decimal totalAccounted = fineReturned + allowedWastage;
        Assert.Equal(44.880m, totalAccounted);

        // Remaining balance karigar must return: 50.000 - 44.880 = 5.120g
        decimal remainingBalance = currentLiability - totalAccounted;
        Assert.Equal(5.120m, remainingBalance);
    }
}
