# Changelog

All notable changes to the AZ Cost Assessment will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-12

### Added
- **Initial Public Release** 🎉
- Azure Cost Management API integration with comprehensive cost analysis
- 90-day historical cost tracking and analysis
- 3-month cost comparison (apples-to-apples full months + current month projected)
- Daily spend visualization for past 14 days
- Cost trend analysis with 7-day and 30-day moving averages
- Anomaly detection using statistical analysis (z-score based)
- Smart recommendations for cost optimization:
  - Unattached disk detection
  - Stopped/deallocated VM identification
  - Potential savings calculations
- Top expensive services breakdown by category
- **Professional colored console output** with Azure-themed color palette
- **PDF report generation** with formatted charts and recommendations
- Rate-limiting protection (15-second delays, exponential backoff)
- Comprehensive error handling and logging
- JSON report export for programmatic access
- Month-over-month comparison with percentage changes
- Cost forecasting for next 30 days
- Budget alert recommendations
- Reserved Instance savings calculations

### Technical Features
- TypeScript 5.6+ with full type safety
- Service-oriented architecture with clean separation of concerns
- Azure SDK integration (@azure/arm-costmanagement, @azure/identity)
- Winston logging for operational visibility
- PDFKit for professional report generation
- Chalk for colorized terminal output
- Date-fns for reliable date manipulation
- Configuration management via environment variables and config files

### Documentation
- Comprehensive README with installation and usage instructions
- QUICKSTART guide for rapid deployment
- IMPLEMENTATION details for developers
- VALUE proposition document explaining benefits
- SECURITY review documentation
- Example outputs and sample reports

### Security
- No hardcoded credentials or secrets
- Environment variable-based configuration
- Azure AD authentication via DefaultAzureCredential
- Proper .gitignore for sensitive files
- MIT License

## [Unreleased]

### Planned Features
- GitHub Actions CI/CD integration
- Unit and integration test suite
- Azure DevOps pipeline support
- Multi-subscription support
- Custom report templates
- Email notification integration
- Webhook support for alerts
- Cost allocation tag analysis
- Resource group cost breakdown
- Custom time range selection
- Export to CSV/Excel formats

---

[1.0.0]: https://github.com/mobieus10036/azure-cost-analyzer/releases/tag/v1.0.0
