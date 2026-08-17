USE RPMAssure_App;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
IF OBJECT_ID(N'dbo.Dim_Customer_SlaContract', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Customer_SlaContract (
    CustomerCode nvarchar(32) NOT NULL CONSTRAINT PK_Dim_Customer_SlaContract PRIMARY KEY,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_SlaC_Status DEFAULT (N'provisional'),
    DocumentName nvarchar(260) NULL,
    SignedBy nvarchar(120) NULL,
    SignedAtUtc datetime2 NULL,
    ConfirmedSignature bit NOT NULL CONSTRAINT DF_SlaC_Sig DEFAULT (0),
    Notes nvarchar(500) NULL,
    KpiJson nvarchar(max) NULL,
    UpdatedUtc datetime2 NOT NULL CONSTRAINT DF_SlaC_Upd DEFAULT (SYSUTCDATETIME())
  );
END
GO
PRINT '530 Dim_Customer_SlaContract ready';
GO
