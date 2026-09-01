using Npgsql;
using System;

var connStr = "Host=localhost;Port=5432;Database=udyogbill_db;Username=postgres;Password=postgres;";
using var conn = new NpgsqlConnection(connStr);
conn.Open();
Console.WriteLine("Connected!");

var sql = System.IO.File.ReadAllText(@"e:\udyogbillnew\backend\create_expense_tables.sql");
using var cmd = conn.CreateCommand();
cmd.CommandText = sql;
cmd.ExecuteNonQuery();
Console.WriteLine("Tables created successfully!");
