USE RPMAssure_App;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

/* Ticket-level override. Use when Freshdesk left company blank (test tickets). */
IF OBJECT_ID(N'dbo.Dim_Freshdesk_TicketMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Freshdesk_TicketMap (
    TicketId     bigint        NOT NULL,
    CustomerCode nvarchar(32)  NOT NULL,
    Notes        nvarchar(200) NULL,
    Active       bit           NOT NULL CONSTRAINT DF_Fd_TicketMap_Active DEFAULT (1),
    CONSTRAINT PK_Dim_Freshdesk_TicketMap PRIMARY KEY CLUSTERED (TicketId)
  );
END
GO

MERGE dbo.Dim_Freshdesk_TicketMap AS t
USING (VALUES
  (CONVERT(bigint, 16248), N'BHF', N'Test ticket THIS IS A TEST TICKET')
) AS s(TicketId, CustomerCode, Notes)
ON t.TicketId = s.TicketId
WHEN MATCHED THEN UPDATE SET
  t.CustomerCode = s.CustomerCode,
  t.Notes = s.Notes,
  t.Active = 1
WHEN NOT MATCHED THEN INSERT (TicketId, CustomerCode, Notes, Active)
  VALUES (s.TicketId, s.CustomerCode, s.Notes, 1);

UPDATE t SET t.CustomerCode = m.CustomerCode
FROM dbo.Freshdesk_Tickets t
JOIN dbo.Dim_Freshdesk_TicketMap m ON m.Active = 1 AND m.TicketId = t.TicketId
WHERE t.CustomerCode IS NULL OR t.CustomerCode <> m.CustomerCode;

UPDATE i SET i.CustomerCode = m.CustomerCode
FROM dbo.Fact_Incident i
JOIN dbo.Dim_Freshdesk_TicketMap m
  ON m.Active = 1
 AND i.SourceSystem = N'Freshdesk'
 AND i.ExternalRef = N'FD-' + CAST(m.TicketId AS nvarchar(20))
WHERE i.CustomerCode IS NULL OR i.CustomerCode <> m.CustomerCode;

PRINT N'517 ticket map applied';
SELECT TicketId, CustomerCode, Notes FROM dbo.Dim_Freshdesk_TicketMap WHERE Active = 1;
SELECT TicketId, CustomerCode, Subject
FROM dbo.Freshdesk_Tickets WITH (NOLOCK)
WHERE TicketId = 16248
ORDER BY SnapshotDate DESC;
SELECT IncidentId, CustomerCode, Title, ExternalRef, Status
FROM dbo.Fact_Incident WITH (NOLOCK)
WHERE ExternalRef = N'FD-16248';
GO
