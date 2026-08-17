USE RPMAssure_App;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT N'=== Customer Tickets cover (live rows only) ===';
SELECT
  c.CustomerCode,
  c.DisplayName,
  CASE WHEN ISNULL(t.Tickets, 0) > 0 THEN N'Cover' ELSE N'No Cover' END AS TicketCover,
  ISNULL(t.Tickets, 0) AS FactIncidentTickets,
  ISNULL(f.Tickets, 0) AS FreshdeskTickets,
  ISNULL(m.Maps, 0) AS FreshdeskMaps
FROM dbo.Dim_Customer c
LEFT JOIN (
  SELECT CustomerCode, COUNT(*) AS Tickets
  FROM dbo.Fact_Incident WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL
  GROUP BY CustomerCode
) t ON t.CustomerCode = c.CustomerCode
LEFT JOIN (
  SELECT CustomerCode, COUNT(*) AS Tickets
  FROM dbo.Freshdesk_Tickets WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL
    AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Freshdesk_Tickets WITH (NOLOCK))
  GROUP BY CustomerCode
) f ON f.CustomerCode = c.CustomerCode
LEFT JOIN (
  SELECT CustomerCode, COUNT(*) AS Maps
  FROM dbo.Dim_Freshdesk_CompanyMap WITH (NOLOCK)
  WHERE ISNULL(Active,1) = 1
  GROUP BY CustomerCode
) m ON m.CustomerCode = c.CustomerCode
WHERE ISNULL(c.Active, 1) = 1
ORDER BY TicketCover DESC, c.CustomerCode;
GO
