USE RPMAssure_App;
GO
IF COL_LENGTH(N'dbo.App_UserCustomer', N'Pillars') IS NULL
  ALTER TABLE dbo.App_UserCustomer ADD Pillars nvarchar(200) NULL;
GO
PRINT '531 App_UserCustomer.Pillars ready';
GO
