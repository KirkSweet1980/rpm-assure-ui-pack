USE RPMAssure_App;
SET NOCOUNT ON;
GO
/* Agents that heartbeat but never dropped SYNCING/QUEUED. */
UPDATE dbo.Agent_Registry
SET LastStatus = N'ONLINE',
    LastMessage = N'sync flag cleared',
    RequestSyncUtc = NULL
WHERE LastStatus IN (N'SYNCING', N'QUEUED')
  AND LastHeartbeatUtc >= DATEADD(minute, -90, SYSUTCDATETIME())
  AND (
    LastJobUtc IS NULL
    OR LastJobUtc < DATEADD(minute, -12, SYSUTCDATETIME())
  );

SELECT HostName, CustomerCode, LastStatus, LastMessage, LastHeartbeatUtc, LastJobUtc
FROM dbo.Agent_Registry WITH (NOLOCK)
ORDER BY LastHeartbeatUtc DESC;
GO
