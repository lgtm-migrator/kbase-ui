# KBase kbase-ui NEXT Release Notes

none

## CHANGES

### NEW

none

### REMOVED

none

### UNRELEASED

none

### IMPROVEMENTS

- CE-19: auth2-client: refactored to preact, few user-visible changes

### FIXES

- UIP-10: feeds plugin: address any potential xss exposures, no user visible changes
- UIP-11: auth plugin: address any potential xss exposures; no user visible changes, but some functionality fixes (not reported)
- UIP-12: jgi-search plugin: addresses any potential xss exposures
- UIP-13: xss finishing work - auth2-client, just fix title
- UIP-13: catalog - get a foothold with preact; replacing all that jquery append() usage addresses potential xss vulnerabilities
- UIP-13: typeview - update dependencies, make html binding more secure
- UIP-13: dataview - update dependencies, make html binding more secure
- UIP-13: public-search - update dependencies, make html binding more secure, fix result selection for copy
- UIP-13: organizations - fix dependency issue, internal updates
- UIP-14: dataview - refactor genome landing page for efficiency; new layout in tabs
- UFI-18: auth2-client: fix case of sign-in while auth2/signedout view is showing; some language edits
- UFI-19: dataview - fix when referencing objects > 50; view single not all versions; add button to view standalone
- UFI-25: catalog - fix admin menu link 
- UFI-24: auth2-client: fix Globus signout link
- PTV-1817: dataview - add CDS landing page, refactor Feature landing page; migrate to release-dist build via GHA
- PTV-1817: typeview - refactor to preact, fix several bugs, migrate to release-dist build via GHA

### MAJOR DEPENDENCY CHANGES

none
