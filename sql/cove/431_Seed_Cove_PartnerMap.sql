/*
  Seed Dim_Cove_PartnerMap from live Cove AR (company) names
  Adjust CustomerCode if your Dim_Customer codes differ.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

;WITH src AS (
  SELECT * FROM (VALUES
    (N'AHI Carriers', N'AHIC', 2602886, N'6 devices incl AHIC-SSQL-SRV'),
    (N'UVSS', N'UVSS', 2814015, N'UVSS-SYSPRO'),
    (N'Able Tracers', N'ABLE', NULL, N'AT-SERVER'),
    (N'Hydra Sales', N'HYDRA', NULL, N'HYDRASRV'),
    (N'Redsun Raisins Northen Cape', N'RSR', NULL, N'spelling as in Cove'),
    (N'BHF (PNCS)', N'PCNS', 2925801, N'PCNS-WEB1 etc'),
    (N'Remote Site Solutions (Pty) Ltd', N'RSS', NULL, NULL),
    (N'Simply Bright Consulting', N'SBS', NULL, NULL),
    (N'RPM Resources', N'RPMINT', 2601580, N'internal / MSP devices')
  ) v(PartnerName, CustomerCode, PartnerId, Notes)
)
MERGE dbo.Dim_Cove_PartnerMap AS t
USING src AS s
  ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  Notes = s.Notes,
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, s.Notes);

/* Enable pillar where map + customer exist */
UPDATE c
SET c.PillarCove = 1
FROM dbo.Dim_Customer c
WHERE c.Active = 1
  AND EXISTS (
    SELECT 1 FROM dbo.Dim_Cove_PartnerMap m
    WHERE m.CustomerCode = c.CustomerCode AND m.Active = 1
  );

SELECT m.PartnerName, m.CustomerCode, m.PartnerId, m.Active, c.DisplayName
FROM dbo.Dim_Cove_PartnerMap m
LEFT JOIN dbo.Dim_Customer c ON c.CustomerCode = m.CustomerCode
ORDER BY m.PartnerName;

PRINT 'Cove partner map seeded.';
GO
