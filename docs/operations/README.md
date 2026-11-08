<a id="readme-top"></a>

# Operations Runbooks

Use these runbooks to deploy, configure, monitor, and recover the current CatatMD services. The [TRD](../TRD.md) and [DPIA](../DPIA.md) hold the implementation and privacy decisions behind these procedures.

## Runbook Index

| Runbook                                   | Covers                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| [Deployment](deployment.md)               | Main-branch deployments, path filtering, previews, and service rollback.                |
| [Environments](environments.md)           | Local, CI, preview, and production configuration, including regional boundaries.        |
| [Database](database.md)                   | Production migrations, seed scripts, backup limits, retention, and erasure constraints. |
| [Monitoring](monitoring.md)               | Health checks, keep-awake pings, privacy-safe process logs, and audit events.           |
| [Incident Response](incident-response.md) | Supported responses for API, deployment, secret, PHI, red-flag, and provider incidents. |

<p align="right"><a href="#readme-top">&uarr;</a></p>

## System Map

| Component | Host                               | Region                                           | Deploy Path                                                                                                  | Health Check                                                                                                                      |
| --------- | ---------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Frontend  | Vercel, `catatmd.vercel.app`       | Vercel region is not specified in the repository | GitHub Actions deploys production after CI when deployable paths change. Pull requests use the stub backend. | No configured frontend health-check path. CI checks the `/` asset fingerprint. A separate `/api/health` check covers the rewrite. |
| API       | Render, `catatmd-api.onrender.com` | Singapore                                        | Render Git integration deploys the linked branch independently of the Vercel workflow.                       | Render checks `/api/health`.                                                                                                      |
| Postgres  | Supabase Postgres, Supavisor       | Singapore, `ap-southeast-1`                      | Managed database. Production migrations are applied manually with Prisma.                                    | The API health check runs `SELECT 1` through Prisma.                                                                              |

<p align="right"><a href="#readme-top">&uarr;</a></p>
