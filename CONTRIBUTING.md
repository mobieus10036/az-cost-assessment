# Contributing to Azure Cost Analyzer

Thank you for your interest in contributing to the Azure Cost Analyzer! We welcome contributions from the community to make this tool even better.

## 🤝 How to Contribute

### Reporting Issues

If you encounter a bug or have a feature request:

1. **Check existing issues** to avoid duplicates
2. **Use the GitHub Issues** tab to create a new issue
3. **Provide detailed information**:
   - Operating System and version
   - Node.js version (`node --version`)
   - Azure SDK versions
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - **Sanitize all output** - Remove subscription IDs, tenant IDs, and any sensitive data

### Suggesting Features

We love new ideas! When suggesting a feature:

1. **Describe the use case** - Why is this feature valuable?
2. **Provide examples** - How would you use it?
3. **Consider alternatives** - Are there other ways to solve this?
4. **Check the roadmap** - Is it already planned?

## 🔧 Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- Azure CLI installed and configured
- Azure subscription with appropriate permissions
- TypeScript knowledge

### Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/azure-cost-analyzer.git
   cd azure-cost-analyzer
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure subscription details
   ```

6. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

7. **Test your changes**
   ```bash
   npm run build    # Ensure TypeScript compiles
   npm start        # Run the application
   ```

## 📝 Pull Request Guidelines

### Before Submitting

- ✅ Code compiles without errors (`npm run build`)
- ✅ Code follows existing style and conventions
- ✅ No hardcoded credentials or sensitive data
- ✅ Documentation updated (README, code comments)
- ✅ CHANGELOG.md updated with your changes
- ✅ Commit messages are clear and descriptive

### Pull Request Process

1. **Update the CHANGELOG.md** with your changes under `[Unreleased]`
2. **Update documentation** if you changed functionality
3. **Provide a clear PR description**:
   - What does this PR do?
   - Why is this change necessary?
   - How has it been tested?
   - Screenshots/output (sanitized) if applicable
4. **Link related issues** using "Fixes #123" or "Closes #456"
5. **Be responsive** to feedback and review comments

### Commit Message Format

Use clear, descriptive commit messages:

```
Add feature to export reports to CSV

- Implement CSV export functionality in new service
- Add command-line flag --format=csv
- Update README with CSV export examples
- Add tests for CSV generation

Fixes #42
```

## 🎨 Code Style Guidelines

### TypeScript

- Use **TypeScript** for all new code
- Provide **proper types** - avoid `any` when possible
- Use **async/await** for asynchronous operations
- Follow **existing patterns** in the codebase

### Code Organization

- **Services** (`src/services/`) - External integrations (Azure API, storage, etc.)
- **Analyzers** (`src/analyzers/`) - Business logic for cost analysis
- **Models** (`src/models/`) - TypeScript interfaces and types
- **Utils** (`src/utils/`) - Helper functions and utilities

### Naming Conventions

- **Files**: camelCase (e.g., `azureCostManagementService.ts`)
- **Classes**: PascalCase (e.g., `AzureCostManagementService`)
- **Functions**: camelCase (e.g., `getCostAnalysis()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_DELAY_MS`)

### Comments

- Add JSDoc comments for public methods
- Explain "why", not just "what"
- Keep comments up-to-date with code changes

```typescript
/**
 * Analyzes cost trends using moving averages and statistical methods
 * @param costData Historical cost data for analysis
 * @returns Array of detected trends with direction and magnitude
 */
public analyzeTrends(costData: CostAnalysisData): Trend[] {
    // Implementation
}
```

## 🔒 Security Guidelines

- **Never commit credentials** or API keys
- **Sanitize all output** in PRs and issues
- **Use environment variables** for configuration
- **Follow Azure security best practices**
- **Report security issues privately** via email (not public issues)

## 🧪 Testing (Coming Soon)

When we add tests, please:

- Write unit tests for new functionality
- Ensure existing tests pass
- Aim for meaningful test coverage
- Mock Azure API calls in tests

## 📚 Documentation

Good documentation is crucial:

- **Code comments**: Explain complex logic
- **README updates**: Document new features
- **QUICKSTART updates**: Add examples for new features
- **TypeScript types**: Serve as inline documentation

## 🐛 Debugging Tips

### Enable Verbose Logging

Set environment variable:
```bash
LOG_LEVEL=debug npm start
```

### Test with Smaller Datasets

Modify date ranges in the code temporarily:
```typescript
const startDate = subDays(new Date(), 7); // Instead of 90
```

### Use Azure CLI Directly

Test Azure API calls:
```bash
az costmanagement query --type Usage --scope /subscriptions/YOUR_ID
```

## 📋 Checklist for Contributors

Before submitting a PR, ensure:

- [ ] Code compiles: `npm run build`
- [ ] Code follows style guidelines
- [ ] No sensitive data in commits
- [ ] CHANGELOG.md updated
- [ ] Documentation updated
- [ ] PR description is clear
- [ ] Related issues linked
- [ ] Ready for review

## ❓ Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Feature requests**: Open a GitHub Issue
- **Security concerns**: Email the maintainers

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Azure Cost Analyzer better! 🙏
