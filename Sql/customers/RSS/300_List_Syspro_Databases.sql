SET NOCOUNT ON;
SELECT name AS DbName, state_desc FROM sys.databases
WHERE name LIKE N'Syspro%' OR name LIKE N'%Company%' OR name = N'Sysprodb' OR name = N'SYSPRODeployment'
ORDER BY 1;
GO
