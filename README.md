# Team Project

This project is an **automated e-commerce price tracker**, similar in concept to CamelCamelCamel or Keepa. Users submit product URLs from e-commerce platforms, and the system periodically scrapes current prices via scheduled background jobs, stores the results as time-series data, visualizes price history on a dashboard, and sends alerts when a tracked item's price drops below a user-defined threshold. The core engineering challenges are building resilient scrapers (handling anti-bot measures, JS-rendered pages, and site structure changes via an adapter pattern), robustly handling missing or malformed data (out-of-stock items, outlier prices, parser failures), and running reliable background jobs (persistent queues, retry logic, and job health monitoring) — all surfaced through a clean dashboard with price-drop notifications.

## Team

| Name | GitHub username | Role |
| --- | --- | --- |
| Nguyen Trong Dai | Dai-Nguyen1506 | Member |
| Le Ba Phong | CaMapCon26 | Member |
| Mai Tuan Manh | maimanhbel | Member |
| Pham Huu Gia An | happyhusky3303 | Member |
| Mai Huy Dang | huydang2006 | Leader |

## Setup

```bash
git clone <this-repo-url>
cd <repo-name>
```
