USE RPMAssure_App;
SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'IB')
BEGIN
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (N'IB', N'Interbrand', 1);
  PRINT 'Dim_Customer IB inserted';
END
ELSE
  UPDATE dbo.Dim_Customer SET DisplayName = N'Interbrand', Active = 1 WHERE CustomerCode = N'IB';

IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarSyspro') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'IB')
    UPDATE dbo.Dim_Customer_AmsConfig
      SET AmsEnabled = 1, PillarSyspro = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'519_IB_syspro'
    WHERE CustomerCode = N'IB';
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, UpdatedAt, UpdatedBy)
    VALUES (N'IB', 1, 1, SYSUTCDATETIME(), N'519_IB_syspro');
  PRINT 'IB PillarSyspro=1';
END

SELECT c.CustomerCode, c.DisplayName, a.AmsEnabled, a.PillarSyspro
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'IB';
GO
