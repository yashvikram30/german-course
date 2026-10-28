import { notFound } from "next/navigation";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { getExam } from "@/lib/exam";
import { getAttempts } from "@/lib/examData";

export default async function ExamPage(props: PageProps<"/pruefung/[id]">) {
  const { id } = await props.params;
  const exam = getExam(id);
  if (!exam) notFound();
  const history = getAttempts(exam.id, 5).map((a) => ({ takenAt: a.takenAt, total: a.total }));
  return <ExamRunner exam={exam} history={history} />;
}
