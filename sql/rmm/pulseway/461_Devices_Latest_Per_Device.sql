/* Latest RMM device row per DeviceId (not global MAX snapshot).
   Pulseway collect pages write different SnapshotDate values; MAX(SnapshotDate)
   per customer dropped hosts that landed on earlier pages (AHI 6 servers -> 3).
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Devices_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Devices_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Rmm_Devices_Latest
AS
SELECT d.*
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  GROUP BY DeviceId
) m ON m.DeviceId = d.DeviceId AND m.mx = d.SnapshotDate;
GO
PRINT N'vw_Kpi_Rmm_Devices_Latest is now latest-per-DeviceId';
GO
