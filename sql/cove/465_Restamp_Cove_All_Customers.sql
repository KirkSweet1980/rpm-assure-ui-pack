-- Stamp Cove_DeviceStatistics.CustomerCode for every mapped partner, not only BHF.
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NULL
BEGIN
  PRINT N'Cove_DeviceStatistics missing';
  RETURN;
END

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
BEGIN
  UPDATE d
  SET d.CustomerCode = m.CustomerCode
  FROM dbo.Cove_DeviceStatistics AS d
  CROSS APPLY (
    SELECT TOP 1 x.CustomerCode
    FROM dbo.Dim_Cove_PartnerMap AS x
    WHERE x.Active = 1
      AND (
           UPPER(LTRIM(RTRIM(x.PartnerName))) = UPPER(LTRIM(RTRIM(ISNULL(d.Product, N''))))
        OR (
             LEN(LTRIM(RTRIM(x.PartnerName))) >= 3
         AND NULLIF(LTRIM(RTRIM(d.Product)), N'') IS NOT NULL
         AND (
               UPPER(ISNULL(d.Product, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(x.PartnerName))) + N'%'
            OR UPPER(LTRIM(RTRIM(x.PartnerName))) LIKE N'%' + UPPER(LTRIM(RTRIM(d.Product))) + N'%'
             )
           )
        OR (x.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND x.PartnerId = d.PartnerId)
          )
    ORDER BY CASE WHEN UPPER(LTRIM(RTRIM(x.PartnerName))) = UPPER(LTRIM(RTRIM(ISNULL(d.Product, N'')))) THEN 0 ELSE 1 END,
             LEN(x.PartnerName) DESC
  ) AS m
  WHERE d.CustomerCode IS NULL
     OR d.CustomerCode <> m.CustomerCode;
  PRINT CONCAT(N'Cove restamp from partner map: ', @@ROWCOUNT);
END

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerAlias', N'U') IS NOT NULL
BEGIN
  UPDATE d
  SET d.CustomerCode = a.CustomerCode
  FROM dbo.Cove_DeviceStatistics AS d
  INNER JOIN dbo.Dim_Cove_PartnerAlias AS a
    ON a.Active = 1
   AND UPPER(LTRIM(RTRIM(a.PartnerName))) = UPPER(LTRIM(RTRIM(ISNULL(d.Product, N''))))
  WHERE d.CustomerCode IS NULL
     OR d.CustomerCode <> a.CustomerCode;
  PRINT CONCAT(N'Cove restamp from partner alias: ', @@ROWCOUNT);
END

UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'AHIC'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'AHI%' OR MachineName LIKE N'AHI%' OR Product LIKE N'AHI%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'ABLE'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'AT-%' OR DeviceName LIKE N'ABLE%' OR Product LIKE N'Able%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'UVSS'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'UVSS%' OR Product LIKE N'UVSS%' OR Product LIKE N'Unique Vent%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'BHF'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (
    DeviceName LIKE N'BHF%' OR DeviceName LIKE N'PCNS%' OR DeviceName LIKE N'PNCS%'
    OR Product LIKE N'BHF%' OR Product LIKE N'PCNS%' OR Product LIKE N'%Healthcare Funders%'
  );
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'HYDRA'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'HYDRA%' OR Product LIKE N'Hydra%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'RSR'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'RSR%' OR Product LIKE N'Redsun%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'RSS'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'RSS%' OR Product LIKE N'Remote Site%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'SBS'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'SBS%' OR Product LIKE N'Simply%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'RPMINT'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'RPM%' OR Product LIKE N'RPM Resources%');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode = N'IB'
  WHERE (CustomerCode IS NULL OR CustomerCode = N'') AND (DeviceName LIKE N'IB%' OR Product LIKE N'Interbrand%');

PRINT N'465 Cove restamp all customers done';
GO
