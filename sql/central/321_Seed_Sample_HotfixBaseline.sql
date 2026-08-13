/*
  Optional SAMPLE baseline rows for UI demo — replace with real Installer TXT import
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
MERGE dbo.Dim_Syspro_HotfixBaseline AS t
USING (VALUES
  (N'SYSPRO8', N'2025', N'KB8100001', N'Sample mandatory security fix', N'Mandatory', N'Sample — replace via TXT import'),
  (N'SYSPRO8', N'2025', N'KB8100002', N'Sample optional ledger fix', N'Optional', N'Sample — replace via TXT import'),
  (N'SYSPRO8', N'2025', N'KB8100003', N'Sample consolidated pack', N'Consolidated', N'Sample — replace via TXT import')
) AS s(ProductFamily, ReleaseLabel, HotfixCode, Title, Severity, Synopsis)
ON t.ProductFamily = s.ProductFamily AND t.HotfixCode = s.HotfixCode
  AND ISNULL(t.ReleaseLabel,N'') = ISNULL(s.ReleaseLabel,N'')
WHEN NOT MATCHED THEN INSERT (ProductFamily, ReleaseLabel, HotfixCode, Title, Severity, Synopsis, SourceFile)
  VALUES (s.ProductFamily, s.ReleaseLabel, s.HotfixCode, s.Title, s.Severity, s.Synopsis, N'sample-seed');
PRINT N'Sample baseline rows merged (3).';
GO
