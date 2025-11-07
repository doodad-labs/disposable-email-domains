> [!WARNING]  
> This package is currently in its early stages, and some domains may be flagged incorrectly. **We urgently need contributors** to help improve the allow list.

# Automated Disposable Email Domain Scraper  

This tool automatically aggregates disposable email domains through a combination of community contributions and web scraping. The system relies on maintainers who curate an `allow_list.txt` of legitimate domains while actively detecting disposable providers.  

<!-- disposable database size: the number between the backticks on the next line will be automatically updated -->
The database currently tracks **`210,666` known disposable domains**, with regular updates to ensure accuracy. This growing dataset serves as a comprehensive resource for filtering temporary email addresses across applications.  

## Reporting Incorrectly Flagged Domains

If you believe a legitimate domain has been mistakenly identified as disposable, you can help improve the validator by contributing to our allow list.

**How to contribute:**
1. Verify the domain is truly non-disposable (permanent email service)
2. Add the domain to [`allow_list.txt`](./data/allow_list.txt)
3. Submit a pull request with your addition

We welcome community contributions to help maintain the accuracy of our validation system.

## Contributions  

This project is **automatically maintained** through web scraping and data aggregation, but our sources may become outdated, and some domains might be incorrectly flagged. **We need your help** to improve accuracy and keep this resource reliable!  

### First-Time Contributors Welcome!  
We intentionally keep this project **beginner-friendly** to help newcomers start their open-source journey. No experience needed—just a willingness to learn!  

### How You Can Help:  

- **Translations**  : Help make this project accessible globally by translating documentation or UI elements.  
- **Fix False Flags** : If you spot a legitimate domain mistakenly flagged as disposable, submit a correction. ([`allow_list.txt`](./data/allow_list.txt))
- **Improve Data Sources** :
  - **Aggregate lists**: Contribute new sources of disposable email domains.  
  - **Scrapers**: Help maintain or improve our scrapers for temporary email providers.  

### **Report Bugs & Suggest Enhancements**  
Found an issue? Open a ticket or submit a fix!  

**Every contribution—big or small—helps keep the internet safer and more transparent!**  

![](https://contrib.nn.ci/api?repo=doodad-labs/disposable-email-domains)
