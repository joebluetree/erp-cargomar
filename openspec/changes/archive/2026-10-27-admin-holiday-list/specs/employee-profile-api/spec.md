# Spec Delta

## MODIFIED Requirements

### Requirement: Own photo
The system SHALL expose `GET /api/admin/profile/photo`, returning the logged-in user's own employee photo: the file named by `EMP_IMAGE_NAME` in the folder set in configuration (`EmployeeImages:Folder`, `D:\erp-cargomar\resources\images\` by default). It SHALL accept no id or file name from the request, use only the bare file name (never leaving the folder), and serve only `.jpg`, `.jpeg` and `.png` files with their image type. In every other case it SHALL answer 404.

#### Scenario: Photo
- **WHEN** the user's employee has the image name "1590.jpg" and that file is in the configured folder
- **THEN** the response is 200 with content type `image/jpeg` and the file's bytes, and the profile's `hasPhoto` is true

#### Scenario: No image name
- **WHEN** the employee has no image name
- **THEN** the photo request answers 404 and the profile's `hasPhoto` is false

#### Scenario: File missing
- **WHEN** the image name names no file in the folder
- **THEN** the photo request answers 404 and the profile's `hasPhoto` is false

#### Scenario: Path in the name
- **WHEN** the stored image name is "..\secret.jpg"
- **THEN** only "secret.jpg" inside the configured folder is looked for, and no file outside the folder is ever read

#### Scenario: Other file type
- **WHEN** the image name is "notes.txt" and that file exists
- **THEN** the photo request answers 404

#### Scenario: Folder changed in configuration
- **WHEN** `EmployeeImages:Folder` is changed to another folder
- **THEN** photos are read from that folder, with no code change

#### Scenario: Default folder
- **WHEN** no other folder is configured
- **THEN** photos are read from `D:\erp-cargomar\resources\images\`

#### Scenario: No token
- **WHEN** a client requests the photo without a token
- **THEN** the response is 401 and no file is read
