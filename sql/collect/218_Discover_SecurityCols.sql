SET NOCOUNT ON;
PRINT N'=== AdmOperGroup columns ===';
SELECT name FROM Sysprodb.sys.columns WHERE object_id=OBJECT_ID(N'Sysprodb.dbo.AdmOperGroup') ORDER BY column_id;
PRINT N'=== AdmOperAmendJnl columns ===';
SELECT name FROM Sysprodb.sys.columns WHERE object_id=OBJECT_ID(N'Sysprodb.dbo.AdmOperAmendJnl') ORDER BY column_id;
PRINT N'=== AdmUserProduct columns ===';
SELECT name FROM Sysprodb.sys.columns WHERE object_id=OBJECT_ID(N'Sysprodb.dbo.AdmUserProduct') ORDER BY column_id;
PRINT N'=== AdmOperatorSec columns ===';
SELECT name FROM Sysprodb.sys.columns WHERE object_id=OBJECT_ID(N'Sysprodb.dbo.AdmOperatorSec') ORDER BY column_id;
SELECT TOP 3 * FROM Sysprodb.dbo.AdmOperGroup;
SELECT TOP 3 * FROM Sysprodb.dbo.AdmUserProduct;
GO
