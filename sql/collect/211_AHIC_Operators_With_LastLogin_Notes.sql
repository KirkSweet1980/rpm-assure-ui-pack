/*
  OPTIONAL enhancement notes for 210 collect
  ------------------------------------------
  Active users on the AMS UI use Syspro_Operators.LastLoginDate (login in last 30 days).

  Current 210 sets LastLoginDate = NULL (AdmOperator column names vary by site).

  On AHIC, discover login columns then extend 210:

  -- In Sysprodb:
  SELECT c.name, t.name AS type_name
  FROM sys.columns c
  JOIN sys.types t ON c.user_type_id = t.user_type_id
  WHERE c.object_id = OBJECT_ID(N'dbo.AdmOperator')
  ORDER BY c.column_id;

  SELECT c.name
  FROM sys.columns c
  WHERE c.object_id = OBJECT_ID(N'dbo.AdmOperatorLogin')
  ORDER BY c.column_id;

  Typical patterns (verify before use):
    OUTER APPLY (
      SELECT MAX(l.SystemDate) AS LastLogin  -- column name may differ
      FROM Sysprodb.dbo.AdmOperatorLogin l
      WHERE LTRIM(RTRIM(l.Operator)) = LTRIM(RTRIM(o.Operator))
    ) lg

  Then INSERT LastLoginDate = lg.LastLogin

  Job logging: load into Syspro_JobLogging (separate collect) for Job errors panel.
  DTR: load Datarapt balance extracts into Syspro_Dtr* for Module health panel.
*/
