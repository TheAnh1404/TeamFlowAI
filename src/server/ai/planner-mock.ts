import type { PlanningAiInput, PlanningAiProposal, PlanningTaskProposal } from "./contracts";
const normalize=(s:string)=>s.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/đ/g,"d");
const categories=[
  ["api","backend","server","database","sql","du lieu"],
  ["frontend","ui","ux","giao dien","react","design","thiet ke"],
  ["test","qa","kiem thu","kiem chung","quality"],
  ["docs","document","tai lieu","huong dan","noi dung","content"],
];
export function detailedMockPlanner(input:PlanningAiInput):PlanningAiProposal {
  const {project,members}=input;
  if(!members.length)throw Error("Planner requires project members");
  const loads=new Map(members.map(m=>[m.id,0]));
  const select=(work:string,hours:number)=>{
    const normalized=normalize(work);
    const relevant=categories.filter(words=>words.some(w=>normalized.includes(w)));
    const ranked=members.map(member=>{
      const skills=normalize(member.skills.join(" "));
      const match=relevant.filter(words=>words.some(w=>skills.includes(w))).length;
      return {member,match,score:match*10-(loads.get(member.id)??0)/Math.max(member.availableHoursPerWeek,1)*5};
    }).sort((a,b)=>b.score-a.score||a.member.id.localeCompare(b.member.id));
    const winner=ranked[0];loads.set(winner.member.id,(loads.get(winner.member.id)??0)+hours);return winner;
  };
  const tasks:PlanningTaskProposal[]=[];
  const phases=project.deliverables.length<=15?2:1;
  const duration=Date.parse(project.deadline)-Date.parse(project.createdAt);
  for(const [i,output] of project.deliverables.entries()) {
    for(let phase=0;phase<phases;phase++) {
      const verification=phase===1,hours=verification?1:3;
      const {member,match}=select(verification?`kiem thu huong dan ${output}`:output,hours);
      const key=`output-${i+1}-${phase+1}`;
      const title=(verification?"Kiểm chứng & bàn giao: ":"Thực hiện: ")+output;
      tasks.push({tempKey:key,title:title.slice(0,200),
        description:`${verification?"Kiểm tra độc lập và chuẩn bị bàn giao":"Triển khai đầu ra"}: ${output}.\nPhạm vi dự án: ${project.goal.slice(0,1200)}\nĐây là kế hoạch mẫu theo quy tắc, cần trưởng nhóm xác nhận độ phù hợp.`,
        assigneeMemberId:member.id,deadline:new Date(Date.parse(project.createdAt)+Math.floor(duration*((i*phases+phase+1)/(project.deliverables.length*phases+1)))).toISOString(),
        criteria:verification?[`Có kết quả đối chiếu từng yêu cầu của đầu ra: ${output}.`,`Có bằng chứng kiểm tra, ghi rõ vấn đề còn tồn tại và hướng xử lý.`,`Có hướng dẫn để người nhận tái hiện và đánh giá đầu ra.`]:[`Cung cấp sản phẩm hoặc nội dung có thể kiểm tra cho đầu ra: ${output}.`,`Nêu rõ cách chạy/sử dụng, dữ liệu đầu vào và kết quả mong đợi.`,`Ghi nhận phần đã thực hiện, giới hạn và bằng chứng đối chiếu yêu cầu.`],
        dependencyTempKeys:verification?[`output-${i+1}-1`]:[],
        steps:verification?["Nhận đầu ra và đọc các yêu cầu đã thống nhất.","Kiểm tra tình huống chính và một trường hợp lỗi; ghi bằng chứng cụ thể.","Tổng hợp kết quả, vấn đề còn mở và hướng dẫn bàn giao cho trưởng nhóm."]:["Xác nhận phạm vi và thông tin đầu vào cần thiết.",`Thực hiện ${output}, ưu tiên phần bắt buộc trước.`,"Tự kiểm tra, lưu bằng chứng và soạn hướng dẫn bàn giao."],
        assignmentReason:`${match?"Có kỹ năng liên quan":"Chưa có kỹ năng khớp rõ; cần trưởng nhóm xác nhận hoặc bổ sung hỗ trợ"} (${member.skills.join(", ").slice(0,400)}), ${member.availableHoursPerWeek} giờ khả dụng/tuần; đã cân nhắc khối lượng đề xuất trước đó.`,estimatedHours:hours,
      });
    }
  }
  return {tasks};
}
