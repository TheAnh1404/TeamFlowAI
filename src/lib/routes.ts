// URL segments only. These IDs never represent a project/task object or dataset.
export const placeholderIds = { project: "placeholder-project", task: "placeholder-task" } as const;

const projectBase = (projectId: string) => "/app/projects/" + encodeURIComponent(projectId);

export const routes = {
  home: "/",
  app: "/app",
  newProject: "/app/projects/new",
  plan: (projectId: string) => projectBase(projectId) + "/plan",
  tasks: (projectId: string) => projectBase(projectId) + "/tasks",
  task: (projectId: string, taskId: string) => projectBase(projectId) + "/tasks/" + encodeURIComponent(taskId),
  chat: (projectId: string) => projectBase(projectId) + "/chat",
  reports: (projectId: string) => projectBase(projectId) + "/reports",
} as const;

// Exact paths from docs/CONTRACTS.md; grouping is ownership, not a second URL prefix.
export const apiRoutes = {
  planning: {
    projects: "/api/projects",
    project: (id: string) => "/api/projects/" + encodeURIComponent(id),
    members: (id: string) => "/api/projects/" + encodeURIComponent(id) + "/members",
    member: (projectId: string, memberId: string) => "/api/projects/" + encodeURIComponent(projectId) + "/members/" + encodeURIComponent(memberId),
    plan: (id: string) => "/api/projects/" + encodeURIComponent(id) + "/plan",
    draft: (id: string) => "/api/plans/" + encodeURIComponent(id) + "/draft",
    publish: (id: string) => "/api/plans/" + encodeURIComponent(id) + "/publish",
  },
  tracking: {
    session: "/api/session",
    users: "/api/users",
    tasks: (id: string) => "/api/projects/" + encodeURIComponent(id) + "/tasks",
    task: (id: string) => "/api/tasks/" + encodeURIComponent(id),
    messages: (id: string) => "/api/projects/" + encodeURIComponent(id) + "/messages",
    progressUpdates: (id: string) => "/api/tasks/" + encodeURIComponent(id) + "/progress-updates",
    resolve: (id: string) => "/api/messages/" + encodeURIComponent(id) + "/resolve",
  },
  delivery: {
    submissions: (id: string) => "/api/tasks/" + encodeURIComponent(id) + "/submissions",
    review: (id: string) => "/api/submissions/" + encodeURIComponent(id) + "/review",
    accept: (id: string) => "/api/tasks/" + encodeURIComponent(id) + "/accept",
    reports: (id: string) => "/api/projects/" + encodeURIComponent(id) + "/reports",
    report: (id: string) => "/api/reports/" + encodeURIComponent(id),
  },
} as const;
