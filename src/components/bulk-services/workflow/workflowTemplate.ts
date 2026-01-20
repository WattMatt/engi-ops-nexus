/**
 * Bulk Services Workflow Template
 * 
 * Standard process for obtaining electrical power from a utility
 * Based on South African electrical industry best practices
 */

export interface WorkflowTask {
  title: string;
  description?: string;
  isCritical: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  linkedDataKey?: string; // Key to auto-populate from document
}

export interface WorkflowPhase {
  phaseNumber: number;
  phaseName: string;
  phaseDescription: string;
  tasks: WorkflowTask[];
}

export const BULK_SERVICES_WORKFLOW_TEMPLATE: WorkflowPhase[] = [
  {
    phaseNumber: 1,
    phaseName: "Load Estimation & Demand Analysis",
    phaseDescription: "Identify and calculate all electrical loads to determine peak demand requirements",
    tasks: [
      {
        title: "Identify connected loads",
        description: "Document all lighting, HVAC, machinery, IT equipment, and motors",
        isCritical: true,
        priority: "critical",
        linkedDataKey: "total_connected_load"
      },
      {
        title: "Calculate peak demand",
        description: "Estimate maximum simultaneous usage (kVA or MW)",
        isCritical: true,
        priority: "critical",
        linkedDataKey: "maximum_demand"
      },
      {
        title: "Apply diversity factor",
        description: "Apply diversity to avoid oversizing (not all loads run at once)",
        isCritical: true,
        priority: "high",
        linkedDataKey: "diversity_factor"
      },
      {
        title: "Plan for future growth",
        description: "Include expansion plans (typically 10-20 years horizon)",
        isCritical: false,
        priority: "medium",
        linkedDataKey: "future_expansion_factor"
      },
      {
        title: "Develop load profile",
        description: "Document daily/seasonal variations to understand demand curve",
        isCritical: false,
        priority: "medium"
      }
    ]
  },
  {
    phaseNumber: 2,
    phaseName: "Bulk Services Requirements",
    phaseDescription: "Determine supply voltage levels, substation needs, and infrastructure requirements",
    tasks: [
      {
        title: "Determine supply voltage level",
        description: "LV for small commercial/residential, MV (11-33kV) for larger facilities, HV for industrial/municipal",
        isCritical: true,
        priority: "critical",
        linkedDataKey: "primary_voltage"
      },
      {
        title: "Assess substation requirements",
        description: "Distribution or dedicated customer substation sized to peak demand + redundancy",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Specify transformer sizing",
        description: "Size transformers based on calculated demand with appropriate margin",
        isCritical: true,
        priority: "high",
        linkedDataKey: "connection_size"
      },
      {
        title: "Define protection & metering requirements",
        description: "Circuit breakers, relays, and utility-approved metering equipment",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Plan cable infrastructure",
        description: "Underground cables or overhead lines routing and specifications",
        isCritical: false,
        priority: "medium"
      },
      {
        title: "Specify switchgear and panels",
        description: "Distribution equipment for premises internal distribution",
        isCritical: false,
        priority: "medium"
      }
    ]
  },
  {
    phaseNumber: 3,
    phaseName: "Utility Application & Requirements",
    phaseDescription: "Prepare and submit formal application to utility with all required documentation",
    tasks: [
      {
        title: "Prepare formal application",
        description: "Complete utility application forms with load estimates and site plans",
        isCritical: true,
        priority: "critical",
        linkedDataKey: "supply_authority"
      },
      {
        title: "Document maximum demand (kVA/MW)",
        description: "Provide detailed calculations and assumptions",
        isCritical: true,
        priority: "high",
        linkedDataKey: "maximum_demand"
      },
      {
        title: "Prepare load profile documentation",
        description: "Daily/seasonal load curves and usage patterns",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Specify requested voltage level",
        description: "Document voltage requirements and justification",
        isCritical: true,
        priority: "high",
        linkedDataKey: "primary_voltage"
      },
      {
        title: "Document short-circuit rating",
        description: "Equipment short-circuit rating specifications",
        isCritical: false,
        priority: "medium"
      },
      {
        title: "Power factor correction plans",
        description: "Document PFC equipment and target power factor",
        isCritical: false,
        priority: "medium"
      },
      {
        title: "Prepare site layout drawings",
        description: "Show substation location, cable routes, and equipment positions",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Obtain environmental approvals",
        description: "Environmental impact assessment if required",
        isCritical: false,
        priority: "medium"
      },
      {
        title: "Review connection fees and tariffs",
        description: "Understand bulk supply tariffs and service agreements",
        isCritical: false,
        priority: "low"
      }
    ]
  },
  {
    phaseNumber: 4,
    phaseName: "Design & Approval",
    phaseDescription: "Technical review, network assessment, and formal approval process",
    tasks: [
      {
        title: "Utility technical review",
        description: "Utility engineers assess feasibility and grid impact",
        isCritical: true,
        priority: "critical"
      },
      {
        title: "Network reinforcement assessment",
        description: "Utility evaluates if feeder or substation upgrades are needed",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Submit technical drawings",
        description: "Detailed drawings and protection schemes for utility approval",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Protection scheme approval",
        description: "Coordination studies and relay settings approval",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Sign connection agreement",
        description: "Contract with terms of supply, tariffs, and responsibilities",
        isCritical: true,
        priority: "critical"
      }
    ]
  },
  {
    phaseNumber: 5,
    phaseName: "Construction & Installation",
    phaseDescription: "Build infrastructure, install equipment, and complete testing",
    tasks: [
      {
        title: "Build internal electrical infrastructure",
        description: "Customer-owned switchgear, cabling, and transformers",
        isCritical: true,
        priority: "critical"
      },
      {
        title: "Ensure utility specification compliance",
        description: "Verify all equipment meets utility technical specifications",
        isCritical: true,
        priority: "high",
        linkedDataKey: "electrical_standard"
      },
      {
        title: "Coordinate grid extension",
        description: "Utility extends grid to customer point of supply",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Install metering equipment",
        description: "Utility-approved metering and protection installation",
        isCritical: true,
        priority: "high"
      },
      {
        title: "Conduct joint inspection",
        description: "Utility and customer joint inspection before energization",
        isCritical: true,
        priority: "critical"
      },
      {
        title: "Complete testing & commissioning",
        description: "Verify safety, protection, and metering accuracy",
        isCritical: true,
        priority: "critical"
      },
      {
        title: "Initial energization",
        description: "First power-on with utility supervision",
        isCritical: true,
        priority: "critical"
      }
    ]
  },
  {
    phaseNumber: 6,
    phaseName: "Operation & Monitoring",
    phaseDescription: "Ongoing requirements for maintaining electrical supply connection",
    tasks: [
      {
        title: "Maintain power factor",
        description: "Keep power factor above 0.95 to avoid penalties",
        isCritical: false,
        priority: "high"
      },
      {
        title: "Implement demand-side management",
        description: "Load management strategies to optimize consumption",
        isCritical: false,
        priority: "medium"
      },
      {
        title: "Routine equipment maintenance",
        description: "Schedule maintenance for customer-owned equipment",
        isCritical: false,
        priority: "medium"
      },
      {
        title: "Set up smart metering integration",
        description: "SCADA and monitoring system integration with utility",
        isCritical: false,
        priority: "low"
      },
      {
        title: "Establish reporting procedures",
        description: "Regular reporting and communication with utility",
        isCritical: false,
        priority: "low"
      }
    ]
  }
];

export function getPhaseStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50 border-green-200';
    case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'blocked': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-muted-foreground bg-muted/30 border-border';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'text-red-700 bg-red-100';
    case 'high': return 'text-orange-700 bg-orange-100';
    case 'medium': return 'text-yellow-700 bg-yellow-100';
    default: return 'text-slate-600 bg-slate-100';
  }
}
