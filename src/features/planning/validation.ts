import type { DraftTask, Project, ProjectMember } from "@/contracts";
export function draftProblems(tasks: DraftTask[], project: Project, members: ProjectMember[]): string[] {
    const errors: string[] = [];
    if (!tasks.length || tasks.length > 30)
        errors.push("Kế hoạch cần từ 1 đến 30 công việc.");
    const ids = new Set(tasks.map(t => t.id));
    const criteria = tasks.flatMap(t => t.criteria.map(c => c.id));
    if (ids.size !== tasks.length || new Set(criteria).size !== criteria.length)
        errors.push("ID công việc hoặc tiêu chí bị trùng.");
    for (const t of tasks) {
        if (!t.title.trim() || t.title.length > 200 || t.description.length > 4000)
            errors.push("Tên công việc bắt buộc (tối đa 200 ký tự), mô tả tối đa 4.000 ký tự.");
        if (!members.some(m => m.id === t.assigneeMemberId))
            errors.push("Chọn người phụ trách trong dự án.");
        if (!Number.isFinite(Date.parse(t.deadline)) || Date.parse(t.deadline) > Date.parse(project.deadline))
            errors.push("Hạn công việc phải hợp lệ và không sau hạn dự án.");
        if (!t.criteria.length || t.criteria.length > 10 || t.criteria.some(c => !c.text.trim() || c.text.length > 1000))
            errors.push("Mỗi công việc cần 1–10 tiêu chí, tối đa 1.000 ký tự mỗi tiêu chí.");
        if (t.dependencyTaskIds.some(id => !ids.has(id) || id === t.id) || new Set(t.dependencyTaskIds).size !== t.dependencyTaskIds.length)
            errors.push("Phụ thuộc phải trỏ đến công việc khác trong kế hoạch, không trùng.");
    }
    const visiting = new Set<string>(), visited = new Set<string>();
    const walk = (id: string): boolean => {
        if (visiting.has(id))
            return true;
        if (visited.has(id))
            return false;
        visiting.add(id);
        if (tasks.find(t => t.id === id)?.dependencyTaskIds.some(walk))
            return true;
        visiting.delete(id);
        visited.add(id);
        return false;
    };
    if (tasks.some(t => walk(t.id)))
        errors.push("Kế hoạch có phụ thuộc vòng.");
    return [...new Set(errors)];
}
