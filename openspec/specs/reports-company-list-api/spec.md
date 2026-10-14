# reports-company-list-api Specification

## Purpose
Provides the read-only backend endpoint behind the Company List report: it returns a filtered page of the companies held in the existing `COMPANYM` table, following the shared paging contract, and it is the first business module of the backend.

## Requirements

### Requirement: Company list endpoint
The system SHALL expose a read-only `GET /api/reports/companies` endpoint that returns one page of companies, following the common paging request and response of the `server-side-tables` capability. It SHALL accept the optional filters `code` and `name`, a one-based `page` (default 1) and a `pageSize` (default 10; 2, 5, 10, 25, 50 or 100). A company matches when its code contains `code` and its name contains `name`, ignoring letter case; a missing or blank filter does not restrict, and both filters combine. The matching companies SHALL be ordered by company name ascending and then by identifier, so that paging is stable (BR-001.1). The response SHALL contain `items` (each with the company's identifier, code, name, address lines 1 to 3, telephone, email and web address), `total`, `page` and `pageSize`. The endpoint SHALL accept no request body and SHALL NOT change any data.

#### Scenario: Companies exist
- **WHEN** a client requests `GET /api/reports/companies` and the table holds 4 companies
- **THEN** the response is 200 with 4 items ordered by name ascending, `total` 4, `page` 1 and `pageSize` 10

#### Scenario: Paging
- **WHEN** 23 companies exist and a client requests `page=3&pageSize=10`
- **THEN** the response has the last 3 companies in order and `total` 23

#### Scenario: Filter by code
- **WHEN** a client requests `code=ab`
- **THEN** only companies whose code contains "ab" in any letter case are returned, and `total` counts only those

#### Scenario: Filter by name
- **WHEN** a client requests `name=TRAD`
- **THEN** only companies whose name contains "trad" in any letter case are returned

#### Scenario: Both filters
- **WHEN** a client requests both `code` and `name`
- **THEN** only companies matching both are returned

#### Scenario: Filter characters are plain text
- **WHEN** a client requests `name=100%` or `name=a_b`
- **THEN** the characters are matched literally and are not treated as wildcards

#### Scenario: No companies
- **WHEN** a client requests the endpoint and no company matches
- **THEN** the response is 200 with an empty `items` array and `total` 0

#### Scenario: Page after the last
- **WHEN** 4 companies exist and a client requests `page=5`
- **THEN** the response is 200 with no items and `total` 4

#### Scenario: Invalid paging values
- **WHEN** a client requests `page=0`, `pageSize=7`, or a `code` longer than 60 characters
- **THEN** the response is 400 problem details naming the field

#### Scenario: Optional fields empty
- **WHEN** a company has no value for address line 2, address line 3, telephone, email or web
- **THEN** the item is returned with that field empty and the request does not fail

#### Scenario: Read-only
- **WHEN** a client sends POST, PUT, PATCH or DELETE to the endpoint
- **THEN** the response is 405 and no data changes

### Requirement: Only companies are listed
The endpoint SHALL return only rows of `COMPANYM` that are companies (`COMP_TYPE` = 'C'). Branch rows (`COMP_TYPE` = 'B') and rows marked deleted (`REC_DELETED_DATE` not null) SHALL NOT be returned.

#### Scenario: Branches excluded
- **WHEN** the table holds 4 company rows and 26 branch rows
- **THEN** the response contains exactly the 4 company rows

#### Scenario: Deleted company excluded
- **WHEN** a company row has a deletion date
- **THEN** it is not returned

### Requirement: Existing company table is mapped read-only
The system SHALL read companies from the existing Oracle table `COMPANYM` with columns `COMP_PKID`, `COMP_CODE`, `COMP_NAME`, `COMP_ADDRESS1`, `COMP_ADDRESS2`, `COMP_ADDRESS3`, `COMP_TEL`, `COMP_EMAIL` and `COMP_WEB`. The system SHALL NOT create, alter or drop this table, and applying migrations SHALL NOT touch it. The key `COMP_PKID` is a string and SHALL be used as the company identifier as stored.

#### Scenario: Migrations leave the table alone
- **WHEN** migrations are applied to a schema that already contains `COMPANYM`
- **THEN** the table, its columns and its rows are unchanged

#### Scenario: String key returned as stored
- **WHEN** a company whose `COMP_PKID` is a non-GUID string is listed
- **THEN** its identifier is returned exactly as stored

### Requirement: Company list works on Oracle 10g
The company list query, including its count and any page, SHALL run on Oracle Database 10.2 without a SQL syntax error.

#### Scenario: Listing on 10.2
- **WHEN** the endpoint is called against an Oracle 10.2 database
- **THEN** the companies are returned without a SQL error

#### Scenario: Second page on 10.2
- **WHEN** `page=2&pageSize=5` is requested against an Oracle 10.2 database that holds more than 5 matching companies
- **THEN** the second set of companies in the same order is returned and does not repeat the first page

### Requirement: Company list failures are reported as problem details
When the companies cannot be read, the endpoint SHALL return an RFC 7807 problem response without internal error details, consistent with the other API errors.

#### Scenario: Database unavailable
- **WHEN** the database cannot be reached while listing companies
- **THEN** the response is 500 problem details with a trace identifier and no exception text

### Requirement: Reports module registration
The company list SHALL live in a separate Reports module that registers its own services and repository through one registration entry point called once from the Api host, and whose controller is routed by the host. The module SHALL follow the documented dependency rules.

#### Scenario: Module registered
- **WHEN** the Api host starts
- **THEN** the Reports module's controller is routable and its services resolve

#### Scenario: Dependency rules still hold
- **WHEN** the architecture tests run
- **THEN** they pass with the Reports module present, and the module references neither Api nor another module
