import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "What do the project status indicators mean?",
    answer: "The project status shows the current phase: 'Pending' means waiting for information, 'In Progress' indicates active work, 'Complete' means all deliverables have been received, and 'On Hold' indicates the project is temporarily paused."
  },
  {
    question: "How do I request changes to the tenant schedule?",
    answer: "You can request changes by using the 'Submit Feedback' form and selecting 'Change Request' as the type. Alternatively, use the Quick Actions to report an issue or use the review checklist to highlight specific concerns."
  },
  {
    question: "Who do I contact for technical questions?",
    answer: "For technical questions about electrical specifications, generator sizing, or load calculations, please submit a feedback with the 'Technical' category selected. Your query will be routed to the appropriate engineering team member."
  },
  {
    question: "How do I approve the schedule?",
    answer: "Once you've reviewed all sections, you can submit your approval using the Review Checklist. If everything looks correct, select 'All Looks Good' for each section. If you have concerns, mark them and provide comments."
  },
  {
    question: "Can I download project documents?",
    answer: "Yes, navigate to the Documents tab where you can download individual files or use the 'Download All' button to get a ZIP archive of all available project documents."
  },
  {
    question: "How long do I have to review the project?",
    answer: "The review timeline depends on your project schedule. Please check with your project manager for specific deadlines. Your feedback and approval are important for project progression."
  },
  {
    question: "What happens after I submit feedback?",
    answer: "Your feedback is immediately visible to the project team. They will review your comments and either respond directly or make the requested changes. You'll be able to see the status of your requests in the Feedback tab."
  },
  {
    question: "Can I add attachments to my feedback?",
    answer: "Currently, you can reference specific items (tenants, zones) in your feedback. For detailed attachments, please submit a formal request using the 'Submit Request' form and describe the documents you'd like to share."
  },
];

export const FAQSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-sm text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
