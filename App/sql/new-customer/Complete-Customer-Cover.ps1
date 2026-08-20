# Complete-Customer-Cover.ps1 - RMM / Cove / EPP / M365 map after SQL onboard
param(
  [string]$CustomerCode = 'SIRF',
  [string]$DisplayName = 'Sir Fruit',
  [string]$CentralHost = '102.222.21.220,14333',
  [string]$CentralDb = 'RPMAssure_App',
  [string]$CentralUser = 'rpmassure'
)
$ErrorActionPreference = 'Stop'
$Pwd = ''

function W($c,$m){ Write-Host $m -ForegroundColor $c }
function Ask($p,$d){ $v=Read-Host "$p [$d]"; if([string]::IsNullOrWhiteSpace($v)){$d}else{$v.Trim()} }
function Esc($s){ if($null -eq $s){''}else{$s -replace "'","''"} }
function Find-Sqlcmd {
  $c=Get-Command sqlcmd.exe -EA SilentlyContinue; if($c){return $c.Source}
  foreach($p in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe'
  )){ if(Test-Path $p){return $p} }
  throw 'sqlcmd.exe not found'
}
function Sql([string]$q,[int]$t=60){
  $tmp=Join-Path $env:TEMP ("cv_"+[guid]::NewGuid().ToString('N').Substring(0,8)+".sql")
  $out=Join-Path $env:TEMP ("cv_"+[guid]::NewGuid().ToString('N').Substring(0,8)+".out")
  $err=Join-Path $env:TEMP ("cv_"+[guid]::NewGuid().ToString('N').Substring(0,8)+".err")
  [IO.File]::WriteAllText($tmp,$q,(New-Object System.Text.UTF8Encoding $false))
  $p=Start-Process -FilePath $script:sqlcmd -ArgumentList @('-S',$CentralHost,'-d',$CentralDb,'-C','-b','-I','-t',"$t",'-W','-s','|','-U',$CentralUser,'-P',$Pwd,'-i',$tmp) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err
  $so=''; $se=''
  if(Test-Path $out){$so=Get-Content $out -Raw -EA SilentlyContinue}
  if(Test-Path $err){$se=Get-Content $err -Raw -EA SilentlyContinue}
  Remove-Item $tmp,$out,$err -Force -EA SilentlyContinue
  [pscustomobject]@{Ok=($p.ExitCode -eq 0);StdOut=$so;StdErr=$se}
}
function Rows($text){
  $a = New-Object System.Collections.Generic.List[string]
  foreach($line in (($text+'') -split "`r?`n")){
    $n=$line.Trim()
    if(-not $n){continue}
    if($n -match '^(OrganizationName|PartnerName|CompanyName|Kind|Msg|CustomerCode|DisplayName|Syspro|Pillar|Status|NO_)'){continue}
    if($n -match '^-+' -or $n -match 'rows affected'){continue}
    if($n -match 'System\.Object|Invalid column|Level 16|Msg \d+'){continue}
    [void]$a.Add($n)
  }
  return $a.ToArray()
}
function LikeOr($col,$tok){
  (($tok | ForEach-Object { "$col LIKE N'%"+(Esc $_)+"%'" }) -join ' OR ')
}
function Set-Pillar($col,$val){
  Sql @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig',N'U') IS NULL RETURN;
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode=N'$codeLit')
  INSERT dbo.Dim_Customer_AmsConfig (CustomerCode,AmsEnabled,$col) VALUES (N'$codeLit',1,$val);
ELSE UPDATE dbo.Dim_Customer_AmsConfig SET $col=$val, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=N'cover-check'
  WHERE CustomerCode=N'$codeLit';
"@ | Out-Null
}

W Cyan '=== RPM Assure cover check (RMM / Cove / BD / M365) ==='
$CustomerCode = (Ask 'Customer code' $CustomerCode).ToUpperInvariant()
$DisplayName  = Ask 'Display name' $DisplayName
$CentralHost  = Ask 'Central host,port' $CentralHost
if((Ask 'Use standard collect password? (Y/n)' 'Y') -match '^[nN]'){
  $ss=Read-Host 'Central SQL password' -AsSecureString
  $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
  $Pwd=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
}
$script:sqlcmd=Find-Sqlcmd
$codeLit=Esc $CustomerCode
$nameLit=Esc $DisplayName
$tok=@($CustomerCode)
foreach($w in ($DisplayName -split '[^A-Za-z0-9]+')){
  if($w.Length -ge 3 -and $w -notmatch '^(pty|ltd|the|and)$'){ $tok+=$w }
}
$tok=$tok | Select-Object -Unique
W Green ("sqlcmd="+$script:sqlcmd+"  tokens="+($tok -join ','))

$p=Sql "SET NOCOUNT ON; SELECT DB_NAME(), SUSER_SNAME();"
if(-not $p.Ok){ Write-Host $p.StdOut; Write-Host $p.StdErr; throw 'Cannot connect to central.' }
W Green 'Central OK'

$c=Sql "SET NOCOUNT ON; SELECT CustomerCode, DisplayName, SqlInstanceName FROM dbo.Dim_Customer WHERE CustomerCode=N'$codeLit';"
if(($c.StdOut+'') -notmatch $CustomerCode){ throw "Customer $CustomerCode not on central. Run SQL one-shot first." }
Write-Host $c.StdOut

$score=[ordered]@{SYSPRO='?';RMM='?';COVE='?';EPP='?';CSP='?'}

W Cyan '--- SYSPRO ---'
$sy=Sql @"
SET NOCOUNT ON;
DECLARE @i nvarchar(100)=(SELECT TOP 1 SqlInstanceName FROM dbo.Dim_Customer WHERE CustomerCode=N'$codeLit');
SELECT 'operators' AS Kind, COUNT(*) AS Cnt FROM dbo.Syspro_Operators WITH (NOLOCK) WHERE InstanceName=@i;
"@
Write-Host $sy.StdOut
$score.SYSPRO = if($sy.StdOut -match '\|\s*[1-9]'){'COVERED (data)'}else{'registered - no collect yet'}

function Pick-Map($title,$rows,$default){
  $flat = New-Object System.Collections.Generic.List[string]
  foreach($r in @($rows)){
    if($null -eq $r){continue}
    if($r -is [System.Array]){ foreach($x in $r){ if($x){ [void]$flat.Add([string]$x) } } }
    else { [void]$flat.Add([string]$r) }
  }
  $script:PickedNames = New-Object System.Collections.Generic.List[string]
  if($flat.Count -lt 1){ return 0 }
  $i=1; foreach($r in $flat){ Write-Host ("  {0}) {1}" -f $i,$r); $i++ }
  $pick=Ask $title $default
  if($pick -match '^(NONE|none|n)$'){ return 0 }
  if($pick -match '^(ALL|all)$'){ $nums = 1..$flat.Count }
  else { $nums = @($pick.Split(',') | ForEach-Object { [int]($_.Trim()) }) }
  foreach($n in $nums){
    if($n -lt 1 -or $n -gt $flat.Count){continue}
    $name = (($flat[$n-1] -split '\|')[0]).Trim()
    if($name){ [void]$script:PickedNames.Add($name) }
  }
  return $script:PickedNames.Count
}

W Cyan '--- RMM (Pulseway) ---'
$have=Sql "SET NOCOUNT ON; IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap',N'U') IS NULL BEGIN SELECT N'NO_TABLE'; RETURN; END; SELECT OrganizationName FROM dbo.Dim_Pulseway_OrgMap WHERE CustomerCode=N'$codeLit' AND Active=1;"
Write-Host 'Mapped:'; Write-Host $have.StdOut
$cand=Sql @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Pulseway_Devices',N'U') IS NULL BEGIN SELECT N'NO_TABLE'; RETURN; END
SELECT TOP 25 OrganizationName, COUNT_BIG(*) AS Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate=(SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND ($(LikeOr 'OrganizationName' $tok))
GROUP BY OrganizationName ORDER BY Devices DESC;
"@
Write-Host 'Candidates:'; Write-Host $cand.StdOut
$rr=@(Rows $cand.StdOut)
if((Pick-Map 'Map which Pulseway orgs (comma / ALL / NONE)' $rr $(if(@($rr).Count -eq 1){'1'}else{'NONE'})) -gt 0){
  foreach($name in $script:PickedNames){
    $org=Esc $name
    Sql @"
SET NOCOUNT ON;
MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (SELECT N'$org' OrganizationName, N'$codeLit' CustomerCode) s ON t.OrganizationName=s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode=s.CustomerCode, Active=1, Notes=N'cover-check'
WHEN NOT MATCHED THEN INSERT (OrganizationName,CustomerCode,Active,Notes) VALUES (s.OrganizationName,s.CustomerCode,1,N'cover-check');
UPDATE dbo.Pulseway_Devices SET CustomerCode=N'$codeLit' WHERE OrganizationName=N'$org';
SELECT N'MAPPED' AS Msg, N'$org';
"@ | ForEach-Object { Write-Host $_.StdOut }
  }
  Set-Pillar 'PillarPulseway' 1; $score.RMM='COVERED (mapped)'
} else {
  if((Ask 'On Pulseway / RMM? (Y/n)' 'N') -match '^[nN]'){
    Set-Pillar 'PillarPulseway' 0; $score.RMM='NO COVER (explicit)'
  } else {
    $man=Ask 'Exact Pulseway OrganizationName (blank skip)' ''
    if($man){
      $org=Esc $man
      Sql "SET NOCOUNT ON; MERGE dbo.Dim_Pulseway_OrgMap AS t USING (SELECT N'$org' OrganizationName, N'$codeLit' CustomerCode) s ON t.OrganizationName=s.OrganizationName WHEN MATCHED THEN UPDATE SET CustomerCode=s.CustomerCode, Active=1 WHEN NOT MATCHED THEN INSERT (OrganizationName,CustomerCode,Active,Notes) VALUES (s.OrganizationName,s.CustomerCode,1,N'manual'); UPDATE dbo.Pulseway_Devices SET CustomerCode=N'$codeLit' WHERE OrganizationName=N'$org';" | Out-Null
      Set-Pillar 'PillarPulseway' 1; $score.RMM='COVERED (manual)'
    } else { $score.RMM='GAP - on RMM but not in snapshot' }
  }
}

W Cyan '--- Cove backup ---'
Sql "SET NOCOUNT ON; IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap',N'U') IS NULL BEGIN SELECT N'NO_TABLE'; RETURN; END; SELECT PartnerName FROM dbo.Dim_Cove_PartnerMap WHERE CustomerCode=N'$codeLit';" | ForEach-Object { Write-Host 'Mapped:'; Write-Host $_.StdOut }
$cove=Sql @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Cove_DeviceStatistics',N'U') IS NULL BEGIN SELECT N'NO_TABLE'; RETURN; END
SELECT TOP 25 Product AS PartnerName, COUNT_BIG(*) AS Devices
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate=(SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  AND Product IS NOT NULL
  AND ($(LikeOr 'Product' $tok))
GROUP BY Product
ORDER BY Devices DESC;
"@
Write-Host 'Candidates:'; Write-Host $cove.StdOut
$cr=@(Rows $cove.StdOut)
if((Pick-Map 'Map which Cove partners (comma / ALL / NONE)' $cr $(if(@($cr).Count -eq 1){'1'}else{'NONE'})) -gt 0){
  foreach($name in $script:PickedNames){
    $pn=Esc $name
    Sql @"
SET NOCOUNT ON;
MERGE dbo.Dim_Cove_PartnerMap AS t
USING (SELECT N'$pn' PartnerName, N'$codeLit' CustomerCode) s ON t.PartnerName=s.PartnerName
WHEN MATCHED THEN UPDATE SET CustomerCode=s.CustomerCode, Active=1, Notes=N'cover-check'
WHEN NOT MATCHED THEN INSERT (PartnerName,CustomerCode,Active,Notes) VALUES (s.PartnerName,s.CustomerCode,1,N'cover-check');
UPDATE dbo.Cove_DeviceStatistics SET CustomerCode=N'$codeLit' WHERE Product=N'$pn';
SELECT N'MAPPED' AS Msg, N'$pn';
"@ | ForEach-Object { Write-Host $_.StdOut }
  }
  Set-Pillar 'PillarCove' 1; $score.COVE='COVERED (mapped)'
} else {
  if((Ask 'On Cove backup? (Y/n)' 'N') -match '^[nN]'){
    Set-Pillar 'PillarCove' 0; $score.COVE='NO COVER (explicit)'
  } else {
    $man=Ask 'Exact Cove partner name (blank skip)' ''
    if($man){
      $pn=Esc $man
      Sql "SET NOCOUNT ON; MERGE dbo.Dim_Cove_PartnerMap AS t USING (SELECT N'$pn' PartnerName, N'$codeLit' CustomerCode) s ON t.PartnerName=s.PartnerName WHEN MATCHED THEN UPDATE SET CustomerCode=s.CustomerCode, Active=1 WHEN NOT MATCHED THEN INSERT (PartnerName,CustomerCode,Active,Notes) VALUES (s.PartnerName,s.CustomerCode,1,N'manual');" | Out-Null
      Set-Pillar 'PillarCove' 1; $score.COVE='COVERED (manual)'
    } else { $score.COVE='GAP - on Cove but not in snapshot' }
  }
}

W Cyan '--- Bitdefender ---'
$bd=Sql @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints',N'U') IS NULL BEGIN SELECT N'NO_TABLE'; RETURN; END
SELECT TOP 25 CompanyName, COUNT_BIG(*) AS Endpoints
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate=(SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CompanyName IS NOT NULL
  AND ($(LikeOr 'CompanyName' $tok))
GROUP BY CompanyName
ORDER BY Endpoints DESC;
"@
Write-Host 'Candidates:'; Write-Host $bd.StdOut
$br=@(Rows $bd.StdOut)
if((Pick-Map 'Map which BD companies (comma / ALL / NONE)' $br $(if(@($br).Count -eq 1){'1'}else{'NONE'})) -gt 0){
  foreach($name in $script:PickedNames){
    $cn=Esc $name
    Sql @"
SET NOCOUNT ON;
MERGE dbo.Dim_Bitdefender_CompanyMap AS t
USING (SELECT N'$cn' CompanyName, N'$codeLit' CustomerCode) s
  ON t.CompanyName=s.CompanyName AND t.CustomerCode=s.CustomerCode
WHEN MATCHED THEN UPDATE SET Active=1, Notes=N'cover-check'
WHEN NOT MATCHED THEN INSERT (CompanyName,CustomerCode,Active,Notes) VALUES (s.CompanyName,s.CustomerCode,1,N'cover-check');
UPDATE dbo.Bitdefender_Endpoints SET CustomerCode=N'$codeLit' WHERE CompanyName=N'$cn';
SELECT N'MAPPED' AS Msg, N'$cn';
"@ | ForEach-Object { Write-Host $_.StdOut }
  }
  Set-Pillar 'PillarBitdefender' 1; $score.EPP='COVERED (mapped)'
} else {
  if((Ask 'On Bitdefender? (Y/n)' 'N') -match '^[nN]'){
    Set-Pillar 'PillarBitdefender' 0; $score.EPP='NO COVER (explicit)'
  } else { $score.EPP='GAP - on BD but not in snapshot' }
}

W Cyan '--- Microsoft 365 ---'
Sql "SET NOCOUNT ON; IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap',N'U') IS NULL BEGIN SELECT N'NO_TABLE'; RETURN; END; SELECT TenantId, ISNULL(DisplayName,N''), ISNULL(PrimaryDomain,N'') FROM dbo.Dim_Csp_TenantMap WHERE CustomerCode=N'$codeLit';" | ForEach-Object { Write-Host 'Mapped:'; Write-Host $_.StdOut }
if((Ask 'On RPM Microsoft 365 / CSP? (Y/n)' 'N') -match '^[nN]'){
  Set-Pillar 'PillarMicrosoftCsp' 0; $score.CSP='NO COVER (explicit)'
} else {
  $tid=Ask 'Tenant Id GUID (or blank)' ''
  $dom=Ask 'Primary domain e.g. sirfruit.co.za (or blank)' ''
  if($tid -or $dom){
    if(-not $tid){ $tid='pending-'+$CustomerCode.ToLowerInvariant() }
    $tidLit=Esc $tid; $domLit=Esc $dom
    Sql @"
SET NOCOUNT ON;
MERGE dbo.Dim_Csp_TenantMap AS t
USING (SELECT N'$codeLit' CustomerCode, N'$tidLit' TenantId) s ON t.CustomerCode=s.CustomerCode AND t.TenantId=s.TenantId
WHEN MATCHED THEN UPDATE SET PrimaryDomain=NULLIF(N'$domLit',N''), DisplayName=N'$nameLit', Active=1
WHEN NOT MATCHED THEN INSERT (CustomerCode,TenantId,PrimaryDomain,DisplayName,Active,Notes)
  VALUES (s.CustomerCode,s.TenantId,NULLIF(N'$domLit',N''),N'$nameLit',1,N'cover-check');
"@ | Out-Null
    Set-Pillar 'PillarMicrosoftCsp' 1; $score.CSP='COVERED (mapped) - run CSP collect'
  } else {
    Set-Pillar 'PillarMicrosoftCsp' 1; $score.CSP='SHOULD COVER - add tenant in Exco CSP'
  }
}

W Cyan '--- Scorecard ---'
$fin=Sql @"
SET NOCOUNT ON;
SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName,
  ISNULL(a.PillarSyspro,0) Syspro, ISNULL(a.PillarPulseway,0) Rmm,
  ISNULL(a.PillarCove,0) Cove, ISNULL(a.PillarBitdefender,0) Epp,
  ISNULL(a.PillarMicrosoftCsp,0) Csp
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode=c.CustomerCode
WHERE c.CustomerCode=N'$codeLit';
"@
Write-Host $fin.StdOut
W Green ("COVER CHECK  $CustomerCode")
W Green ("  SYSPRO        $($score.SYSPRO)")
W Green ("  RMM Pulseway  $($score.RMM)")
W Green ("  Cove          $($score.COVE)")
W Green ("  Bitdefender   $($score.EPP)")
W Green ("  Microsoft 365 $($score.CSP)")
$dir="C:\RPM-Assure\Sql\customers\$CustomerCode"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
[IO.File]::WriteAllText((Join-Path $dir 'COVER_PROOF.txt'), ("COVER $CustomerCode`r`n"+($score.GetEnumerator()|ForEach-Object{ $_.Key+'='+$_.Value }) -join "`r`n"))
W Green '=== Done ===  Hard-refresh Exco.'
