$source_dir = "d:\Sri-devi-snacks-live\SriDeviSnacks"
$upload_dir = "$source_dir\godaddy_upload"

Write-Host "Cleaning up godaddy_upload..."
Get-ChildItem -Path $upload_dir -Force | Where-Object { $_.Name -ne '.htaccess' } | Remove-Item -Recurse -Force

Write-Host "Copying frontend build..."
Copy-Item -Path "$source_dir\frontend\dist\*" -Destination $upload_dir -Recurse -Force

Write-Host "Copying backend files..."
New-Item -ItemType Directory -Force -Path "$upload_dir\api" | Out-Null
Get-ChildItem -Path "$source_dir\php-backend" -Force | Where-Object { $_.Name -ne 'db.sqlite' -and $_.Name -ne 'test_query.php' -and $_.Name -ne 'README.md' } | Copy-Item -Destination "$upload_dir\api" -Recurse -Force

if (Test-Path "$source_dir\SriDeviSnacks_Upload.zip") {
    Write-Host "Removing old zip..."
    Remove-Item "$source_dir\SriDeviSnacks_Upload.zip" -Force
}

Write-Host "Creating new zip file..."
Compress-Archive -Path "$upload_dir\*", "$upload_dir\.htaccess" -DestinationPath "$source_dir\SriDeviSnacks_Upload.zip" -Update

Write-Host "Done! Upload zip is ready at SriDeviSnacks_Upload.zip"
