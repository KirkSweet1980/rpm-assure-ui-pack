USE RPMAssure_App;
SET NOCOUNT ON;
GO
/* Interbrand: SYSPRO was test-only. Keep the customer and the menu. Hard-off SYSPRO cover. */
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarSyspro') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'IB')
    UPDATE dbo.Dim_Customer_AmsConfig
      SET PillarSyspro = 0,
          UpdatedAt = SYSUTCDATETIME(),
          UpdatedBy = N'521_IB_syspro_nocover'
    WHERE CustomerCode = N'IB';
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, UpdatedAt, UpdatedBy)
    VALUES (N'IB', 1, 0, SYSUTCDATETIME(), N'521_IB_syspro_nocover');
  PRINT 'IB PillarSyspro=0 (No Cover). Menu stays.';
END
IF OBJECT_ID(N'dbo.Agent_Registry', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Agent_Registry
    SET IsEnabled = 0,
        LastStatus = N'UNINSTALLED'
  WHERE CustomerCode = N'IB';
  PRINT 'IB agent registry marked UNINSTALLED';
END
SELECT c.CustomerCode, c.DisplayName, a.PillarSyspro, a.PillarPulseway, a.PillarCove
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'IB';
GO
