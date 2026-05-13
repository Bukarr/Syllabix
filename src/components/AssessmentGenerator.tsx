import { useState } from 'react';
import { Loader2, FileQuestion, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { getProfile } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';

const ASSESSMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-assessment`;

interface AssessmentQuestion {
  number: number;
  question: string;
  options?: string[];
  marks: number;
}

interface AssessmentSection {
  type: 'objective' | 'theory';
  title: string;
  questions: AssessmentQuestion[];
}

interface AssessmentResult {
  title: string;
  instructions: string;
  sections: AssessmentSection[];
  answerKey: { number: number; answer: string; explanation: string }[];
  totalMarks: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subject: string;
  classLevel: string;
  topic: string;
  subTopic?: string;
}

export function AssessmentGenerator({ open, onOpenChange, subject, classLevel, topic, subTopic }: Props) {
  const isOnline = useOnlineStatus();
  const [assessmentType, setAssessmentType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState('10');
  const [difficulty, setDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const handleGenerate = async () => {
    if (!isOnline) { toast.error('Internet connection required'); return; }
    setIsGenerating(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please sign in to generate assessments'); setIsGenerating(false); return; }
      const resp = await fetch(ASSESSMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subject, classLevel, topic, subTopic, assessmentType, questionCount: parseInt(questionCount), difficulty }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data);
      toast.success('Assessment generated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate assessment');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    const profile = await getProfile();
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 15;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.schoolName || 'School Name', pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(11);
    doc.text(result.title, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subject: ${subject}    Class: ${classLevel}    Total Marks: ${result.totalMarks}`, margin, y);
    y += 6;

    if (result.instructions) {
      doc.setFont('helvetica', 'italic');
      const instrLines = doc.splitTextToSize(result.instructions, pageWidth - 2 * margin);
      doc.text(instrLines, margin, y);
      y += instrLines.length * 5 + 4;
    }

    for (const section of result.sections) {
      if (y > pageHeight - 30) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(section.title, margin, y);
      y += 6;

      for (const q of section.questions) {
        if (y > pageHeight - 25) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const qText = `${q.number}. ${q.question} (${q.marks} mark${q.marks > 1 ? 's' : ''})`;
        const qLines = doc.splitTextToSize(qText, pageWidth - 2 * margin);
        doc.text(qLines, margin, y);
        y += qLines.length * 5;

        if (q.options) {
          for (const opt of q.options) {
            if (y > pageHeight - 20) { doc.addPage(); y = 15; }
            const optLines = doc.splitTextToSize(`   ${opt}`, pageWidth - 2 * margin - 5);
            doc.text(optLines, margin + 5, y);
            y += optLines.length * 4.5;
          }
        }
        y += 3;
      }
      y += 4;
    }

    // Answer Key on new page
    doc.addPage();
    y = 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ANSWER KEY', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    for (const ak of result.answerKey) {
      if (y > pageHeight - 20) { doc.addPage(); y = 15; }
      const akText = `${ak.number}. ${ak.answer}${ak.explanation ? ' — ' + ak.explanation : ''}`;
      const akLines = doc.splitTextToSize(akText, pageWidth - 2 * margin);
      doc.text(akLines, margin, y);
      y += akLines.length * 5;
    }

    const footerY = pageHeight - 10;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generated by Syllabix NG • ${profile?.name || 'Teacher'}`, pageWidth / 2, footerY, { align: 'center' });

    doc.save(`Assessment_${subject}_${classLevel}_${topic.slice(0, 30)}.pdf`);
    toast.success('PDF downloaded!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-primary" />
            Generate Assessment
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{topic} — {classLevel} {subject}</p>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {!result ? (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Assessment Type</Label>
                <Select value={assessmentType} onValueChange={setAssessmentType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objective">Objective (Multiple Choice)</SelectItem>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Number of Questions</Label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Class Level</Label>
                <p className="text-xs text-muted-foreground px-3 py-2 border border-border rounded-md bg-muted/30 mt-1">{classLevel}</p>
              </div>

              <Button onClick={handleGenerate} disabled={isGenerating || !isOnline} className="w-full touch-target font-semibold" size="lg">
                {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><FileQuestion className="h-4 w-4 mr-2" />Generate Assessment</>}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">AI-generated content. Review before use in class.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold">{result.title}</h3>
                <span className="text-xs text-muted-foreground">Total: {result.totalMarks} marks</span>
              </div>

              {result.instructions && (
                <p className="text-xs text-muted-foreground italic">{result.instructions}</p>
              )}

              {result.sections?.map((section, si) => (
                <div key={si} className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground">{section.title}</h4>
                  {section.questions?.map((q, qi) => (
                    <div key={qi} className="p-3 rounded-lg border border-border bg-card/50">
                      <p className="text-sm text-foreground mb-1">{q.number}. {q.question} <span className="text-xs text-muted-foreground">({q.marks} mark{q.marks > 1 ? 's' : ''})</span></p>
                      {q.options && (
                        <div className="pl-4 space-y-0.5 mt-1">
                          {q.options.map((opt, oi) => (
                            <p key={oi} className="text-xs text-muted-foreground">{opt}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {result.answerKey?.length > 0 && (
                <div className="border-t border-border pt-3">
                  <h4 className="text-sm font-bold text-foreground mb-2">Answer Key</h4>
                  <div className="space-y-1">
                    {result.answerKey.map((ak, i) => (
                      <p key={i} className="text-xs text-foreground">
                        <span className="font-medium">{ak.number}.</span> {ak.answer}
                        {ak.explanation && <span className="text-muted-foreground"> — {ak.explanation}</span>}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleExportPDF} className="flex-1 touch-target font-semibold">
                  <Download className="h-4 w-4 mr-2" />Download PDF
                </Button>
                <Button variant="outline" onClick={() => setResult(null)} className="touch-target">
                  New Assessment
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">AI-generated content. Review before use in class.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
