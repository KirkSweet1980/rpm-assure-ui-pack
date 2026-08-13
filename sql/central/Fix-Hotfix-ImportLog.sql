USE RPMAssure_App;
GO
IF COL_LENGTH(N'dbo.Syspro_HotfixImportLog', N'RowCount') IS NOT NULL
   AND COL_LENGTH(N'dbo.Syspro_HotfixImportLog', N'RowsImported') IS NULL
BEGIN
  EXEC sp_rename N'dbo.Syspro_HotfixImportLog.RowCount', N'RowsImported', N'COLUMN';
  PRINT N'Renamed RowCount -> RowsImported';
END
ELSE IF COL_LENGTH(N'dbo.Syspro_HotfixImportLog', N'RowsImported') IS NOT NULL
  PRINT N'RowsImported already OK';
ELSE IF OBJECT_ID(N'dbo.Syspro_HotfixImportLog', N'U') IS NULL
  PRINT N'Table missing - re-run 320';
ELSE
  PRINT N'Check Syspro_HotfixImportLog columns manually';
GO
