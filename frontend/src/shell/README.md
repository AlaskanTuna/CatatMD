<a id="readme-top"></a>
# Application Shell

Public and signed-in page layouts, navigation, and persistent application chrome.

## Module Guide

### Owns

- [AppShell.tsx](AppShell.tsx) lays out protected pages and hosts the guided demo tour.
- [MarketingShell.tsx](MarketingShell.tsx) wraps the landing and privacy pages.
- [SidebarIsland.tsx](SidebarIsland.tsx) and [MobileDock.tsx](MobileDock.tsx) provide desktop and mobile navigation.
- [ChromeCluster.tsx](ChromeCluster.tsx) groups session, theme, and notification controls.
- [NotificationPanel.tsx](NotificationPanel.tsx), [LiveDataWarning.tsx](LiveDataWarning.tsx), and [SiteFooter.tsx](SiteFooter.tsx) provide shared shell content.

### Used By

App.tsx mounts MarketingShell for public pages and AppShell for authenticated application routes.

### Invariants

- **Route boundary:** RequireSession wraps AppShell; the report route is protected separately and remains outside it.
- **Tour context:** AppShell mounts DemoTourProvider, step controls, help button, and spotlight together.
- **Responsive navigation:** SidebarIsland and MobileDock provide the shell's desktop and mobile navigation surfaces.

### Tests

Coverage includes SidebarIsland.test.tsx and MobileDock.test.tsx.

<p align="right"><a href="#readme-top">&uarr;</a></p>
