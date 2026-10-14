# Spec Delta

## MODIFIED Requirements

### Requirement: Small, focused HTTP interceptors
The application SHALL provide HTTP interceptor infrastructure for common request and response concerns. Interceptors SHALL NOT contain feature-specific logic, and each SHALL handle one concern. Adding the session's token to API requests, and ending the session when an API answers 401, SHALL be handled by an interceptor of their own and not by feature code.

#### Scenario: Interceptor applies to all requests
- **WHEN** any feature service sends a request
- **THEN** the registered interceptors process it without the feature opting in

#### Scenario: Token added without feature code
- **WHEN** a feature service sends a request while a session exists
- **THEN** the request carries the token although the feature service did not add it

### Requirement: Lazy-loaded features
The application SHALL support adding features as routes that are loaded on demand. Route guards SHALL be used only for the session check of the `user-session` capability.

#### Scenario: Feature added on demand
- **WHEN** a developer adds a feature as a lazy-loaded route
- **THEN** the feature code is not part of the initial download and is fetched when the user first navigates to it

#### Scenario: Guarded without downloading
- **WHEN** a user without a session opens a lazy-loaded feature route
- **THEN** the login screen is shown and the feature's code is not downloaded
