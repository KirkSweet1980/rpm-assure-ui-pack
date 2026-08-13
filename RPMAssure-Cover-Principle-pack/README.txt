Cover / No Cover - apply to the app
===================================

Every customer, every pillar menu, always:
  live data  -> Covered
  no data    -> No Cover

On the APP server (Administrator):

  $zip  = "$env:USERPROFILE\Downloads\RPMAssure-Cover-Principle.zip"
  $dest = "C:\RPM-Assure\deploy\cover-principle"
  Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
  Unblock-File "$dest\Apply-Cover-Principle.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$dest\Apply-Cover-Principle.ps1"

Then hard-refresh Exco and open Sir Fruit.
