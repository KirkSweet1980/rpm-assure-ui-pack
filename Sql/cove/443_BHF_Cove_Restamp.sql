USE RPMAssure_App;
GO
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NULL
BEGIN
  PRINT 'Dim_Cove_PartnerMap missing';
  RETURN;
END

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerAlias', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Cove_PartnerAlias AS t
  USING (VALUES
    (N'Board of Healthcare Funders', N'BHF'),
    (N'Board of Health Care Funders', N'BHF'),
    (N'BHF Global', N'BHF'),
    (N'BHF', N'BHF'),
    (N'BHF (PNCS)', N'BHF'),
    (N'PCNS', N'BHF')
  ) AS s(PartnerName, CustomerCode)
  ON LTRIM(RTRIM(t.PartnerName)) = s.PartnerName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode
  WHEN NOT MATCHED THEN INSERT (PartnerName, CustomerCode, Notes)
    VALUES (s.PartnerName, s.CustomerCode, N'BHF Cove alias');
END

MERGE dbo.Dim_Cove_PartnerMap AS t
USING (VALUES
  (N'Board of Healthcare Funders', N'BHF'),
  (N'BHF Global', N'BHF'),
  (N'BHF', N'BHF'),
  (N'BHF (PNCS)', N'BHF'),
  (N'PCNS', N'BHF')
) AS s(PartnerName, CustomerCode)
ON LTRIM(RTRIM(t.PartnerName)) = s.PartnerName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, NULL, s.CustomerCode, 1, N'BHF Cove map');

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
BEGIN
  UPDATE d
  SET d.CustomerCode = N'BHF'
  FROM dbo.Cove_DeviceStatistics AS d
  WHERE d.CustomerCode = N'PCNS'
     OR LTRIM(RTRIM(ISNULL(d.Product, N''))) IN (
          N'Board of Healthcare Funders',
          N'BHF Global',
          N'BHF',
          N'BHF (PNCS)',
          N'PCNS'
        );
  PRINT CONCAT('Cove devices restamped to BHF: ', @@ROWCOUNT);
END
GO
