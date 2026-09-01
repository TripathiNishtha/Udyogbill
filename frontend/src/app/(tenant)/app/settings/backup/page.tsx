"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  HardDrive,
  Cpu,
  Activity,
  Database,
  Cloud,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Key,
  FolderSync,
  FileCheck,
  Server,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  backupService,
  BackupJob,
  BackupScheduleConfig,
  SystemHealthReport,
  RestoreVerificationResult,
} from "@/services/backup-services";

export default function BackupAndDisasterRecoveryPage() {
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [schedule, setSchedule] = useState<BackupScheduleConfig | null>(null);
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationModal, setVerificationModal] = useState<RestoreVerificationResult | null>(null);
  const [notification, setNotification] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsData, scheduleData, healthData] = await Promise.all([
        backupService.getBackupJobs(),
        backupService.getScheduleConfig(),
        backupService.getSystemHealth(),
      ]);
      setJobs(jobsData);
      setSchedule(scheduleData);
      setHealth(healthData);
    } catch (e) {
      console.error("Failed to load backup telemetry:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerBackup = async () => {
    try {
      setTriggering(true);
      const res = await backupService.triggerBackup({
        backupType: 2, // TenantDataOnly
        storageProvider: schedule?.storageProvider || 1,
      });
      setNotification(`Backup snapshot "${res.fileName}" created successfully with SHA-256 integrity verification!`);
      await loadData();
    } catch (err: any) {
      alert("Failed to create backup snapshot.");
    } finally {
      setTriggering(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;
    try {
      setSavingSchedule(true);
      await backupService.updateScheduleConfig(schedule);
      setNotification("Cloud backup schedule and storage targets updated successfully!");
      await loadData();
    } catch {
      alert("Failed to update schedule config.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleVerifyIntegrity = async (jobId: string) => {
    try {
      setVerifyingId(jobId);
      const res = await backupService.verifyBackupIntegrity(jobId);
      setVerificationModal(res);
    } catch {
      alert("Failed to verify backup integrity.");
    } finally {
      setVerifyingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <span>Automated Data Backup & Disaster Recovery</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise database snapshots, AWS S3 / Google Drive cloud storage sync, and cryptographic SHA-256 disaster recovery integrity engine.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleTriggerBackup}
            disabled={triggering}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <HardDrive className={`w-4 h-4 ${triggering ? "animate-pulse" : ""}`} />
            <span>{triggering ? "Generating Archive..." : "Create On-Demand Backup"}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* System Health Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Server Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{health?.healthStatus || "HEALTHY"}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Uptime: {health ? Math.floor(health.uptimeSeconds / 60) : 0} mins ({health?.uptimeSeconds || 0}s)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Database Size</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {health ? formatBytes(health.databaseSizeBytes) : "..."}
          </div>
          <div className="text-[11px] text-slate-500">
            PostgreSQL 17 Active Connections: {health?.activeDbConnections || 1}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">RAM / Memory Footprint</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {health?.memoryUsedMb || 0} <span className="text-sm font-normal text-slate-400">MB</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Process working set ({health ? Math.round((health.memoryUsedMb / health.memoryTotalMb) * 100) : 0}% of allocation)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Available Snapshots</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {health?.totalBackupsAvailable || 0} Backups
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {health?.lastBackupTimeUtc
              ? `Last: ${new Date(health.lastBackupTimeUtc).toLocaleTimeString()}`
              : "No backup recorded yet"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup Jobs History Table (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Backup Snapshot Archives ({jobs.length})</span>
            </h2>
            <span className="text-xs text-slate-500">SHA-256 Cryptographic Verification</span>
          </div>

          {jobs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <FolderSync className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <span>No backup archives generated yet. Click "Create On-Demand Backup" above.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 font-semibold">
                    <th className="pb-3">Archive File & Checksum</th>
                    <th className="pb-3">Target Provider</th>
                    <th className="pb-3 text-right">Size</th>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-900/30">
                      <td className="py-3.5 max-w-xs font-mono">
                        <div className="font-semibold text-white truncate" title={job.fileName}>
                          {job.fileName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate" title={job.checksumSha256}>
                          SHA256: {job.checksumSha256.slice(0, 16)}...
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                          {job.storageProvider === 2 ? "AWS S3" : job.storageProvider === 3 ? "Google Drive" : "Local Server"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-white">
                        {formatBytes(job.fileSizeBytes)}
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(job.createdAtUtc).toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleVerifyIntegrity(job.id)}
                            disabled={verifyingId === job.id}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all text-[11px] font-medium"
                            title="Verify Checksum & Disaster Recovery"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`http://localhost:5050/api/v1/tenant/backup/download/${job.id}`}
                            download
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all text-[11px] font-medium"
                            title="Download JSON Snapshot"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Automated Cloud Backup Schedule Settings (1 col) */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span>Automated Cloud Sync</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Cron Engine
            </span>
          </div>

          {schedule && (
            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-850">
                <div>
                  <span className="font-bold text-white block">Auto-Backup Enabled</span>
                  <span className="text-[11px] text-slate-400">Scheduled nightly snapshot</span>
                </div>
                <input
                  type="checkbox"
                  checked={schedule.isAutoBackupEnabled}
                  onChange={(e) => setSchedule({ ...schedule, isAutoBackupEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Frequency</label>
                <select
                  value={schedule.frequency}
                  onChange={(e) => setSchedule({ ...schedule, frequency: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>Daily (Recommended)</option>
                  <option value={2}>Weekly</option>
                  <option value={3}>Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Target Storage Provider</label>
                <select
                  value={schedule.storageProvider}
                  onChange={(e) => setSchedule({ ...schedule, storageProvider: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>Local Server Storage</option>
                  <option value={2}>AWS S3 Bucket</option>
                  <option value={3}>Google Drive API</option>
                </select>
              </div>

              {schedule.storageProvider === 2 && (
                <div className="space-y-3 pt-2 border-t border-slate-850">
                  <div>
                    <label className="text-slate-400 block mb-1">S3 Bucket Name</label>
                    <input
                      type="text"
                      placeholder="e.g. udyogbill-backups-mumbai"
                      value={schedule.s3BucketName || ""}
                      onChange={(e) => setSchedule({ ...schedule, s3BucketName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">AWS Region</label>
                    <input
                      type="text"
                      placeholder="ap-south-1 (Mumbai)"
                      value={schedule.s3Region || ""}
                      onChange={(e) => setSchedule({ ...schedule, s3Region: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Retention Snapshots Count</label>
                <input
                  type="number"
                  min={5}
                  max={365}
                  value={schedule.retentionCount}
                  onChange={(e) => setSchedule({ ...schedule, retentionCount: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-medium"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Automatically prunes snapshots older than {schedule.retentionCount} runs.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingSchedule}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {savingSchedule ? "Saving..." : "Save Backup Schedule"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Disaster Recovery Verification Modal */}
      {verificationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Disaster Recovery Integrity Check</span>
              </h3>
              <button
                onClick={() => setVerificationModal(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cryptographic SHA-256 Verified</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {verificationModal.verificationMessage}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-850">
                <span className="text-slate-400">Archive File</span>
                <span className="font-mono text-white font-semibold">{verificationModal.fileName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-850">
                <span className="text-slate-400">Sales Invoices in Snapshot</span>
                <span className="font-bold text-white">{verificationModal.totalInvoicesInArchive}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-850">
                <span className="text-slate-400">Customers & Debtors</span>
                <span className="font-bold text-white">{verificationModal.totalCustomersInArchive}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-850">
                <span className="text-slate-400">Catalog SKUs</span>
                <span className="font-bold text-white">{verificationModal.totalItemsInArchive}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setVerificationModal(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Close Integrity Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
