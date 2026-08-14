/*
  Mark HYDRA (Hydrasales) as SYSPRO No Cover until later.
  - PillarSyspro = 0 (hard off in app)
  - Clear SqlInstanceName so no accidental collect mapping
  RMM / Cove cover unchanged.
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'HYDRA')
BEGIN
  PRINT N'HYDRA not in Dim_Customer - nothing to do';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET SqlInstanceName = NULL,
      UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = N'HYDRA';
  PRINT N'Cleared SqlInstanceName for HYDRA';

  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'HYDRA')
    UPDATE dbo.Dim_Customer_AmsConfig
    SET PillarSyspro = 0
    WHERE CustomerCode = N'HYDRA';
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, PillarPulseway, PillarCove)
    VALUES (N'HYDRA', 1, 0, NULL, NULL);

  PRINT N'PillarSyspro = 0 for HYDRA (No Cover until re-enabled)';
END

SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName,
       a.PillarSyspro, a.PillarPulseway, a.PillarCove
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'HYDRA';
GO
