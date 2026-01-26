-- AI Skills table for storing skill definitions
CREATE TABLE public.ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  instructions TEXT NOT NULL,
  icon TEXT DEFAULT 'sparkles',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0.0',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User skill preferences for favorites and usage tracking
CREATE TABLE public.user_skill_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_skills
CREATE POLICY "Anyone can view active skills"
  ON public.ai_skills FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Users can create custom skills"
  ON public.ai_skills FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own skills"
  ON public.ai_skills FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND is_system = false)
  WITH CHECK (created_by = auth.uid() AND is_system = false);

CREATE POLICY "Users can delete their own skills"
  ON public.ai_skills FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND is_system = false);

-- RLS Policies for user_skill_preferences
CREATE POLICY "Users can view their preferences"
  ON public.user_skill_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their preferences"
  ON public.user_skill_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their preferences"
  ON public.user_skill_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their preferences"
  ON public.user_skill_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_ai_skills_updated_at
  BEFORE UPDATE ON public.ai_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert baseline skills adapted from Anthropic Skills specification
INSERT INTO public.ai_skills (name, description, category, instructions, icon, is_system, is_active) VALUES
(
  'Electrical Engineering Expert',
  'Expert assistance for cable sizing, load calculations, circuit design, voltage drop analysis, and electrical code compliance per SANS/IEC standards.',
  'Technical',
  '# Electrical Engineering Expert

## Core Competencies
You are an expert electrical engineer specializing in commercial and industrial electrical installations in South Africa.

## Primary Tasks
1. **Cable Sizing**: Calculate appropriate cable sizes based on current carrying capacity, voltage drop, and installation conditions per SANS 10142-1
2. **Load Calculations**: Perform maximum demand calculations using diversity factors and ADMD values
3. **Circuit Design**: Design distribution boards, sub-mains, and final circuits
4. **Voltage Drop Analysis**: Calculate voltage drop for cable runs ensuring compliance with 5% limit
5. **Protection Coordination**: Select appropriate circuit breakers and protection devices
6. **Code Compliance**: Reference SANS 10142-1, NRS 034, and IEC standards

## Response Format
- Provide clear step-by-step calculations
- Reference specific code clauses when applicable
- Include safety considerations and recommendations
- Suggest alternatives when appropriate

## Key Standards
- SANS 10142-1: Wiring of Premises
- SANS 10142-2: Control of Electrical Installation Work
- NRS 034: Electricity Distribution
- IEC 60364: Low-voltage electrical installations',
  'zap',
  true,
  true
),
(
  'Document Generator',
  'Generate professional engineering documents including specifications, reports, variation orders, and handover documentation with proper formatting.',
  'Document',
  '# Document Generator

## Purpose
Generate professional engineering and construction documents with consistent formatting and industry-standard structure.

## Document Types
1. **Technical Specifications**: Equipment specs, material requirements, installation standards
2. **Reports**: Site inspection reports, progress reports, completion certificates
3. **Variation Orders**: Change requests with cost implications and justifications
4. **Handover Documents**: O&M manuals, as-built documentation, training records
5. **Correspondence**: Formal letters, instructions, notices

## Formatting Standards
- Use professional engineering language
- Include proper document headers and footers
- Reference relevant standards and codes
- Include revision tracking information
- Use clear section numbering

## Output Structure
1. Document title and reference number
2. Project details and parties involved
3. Main content with logical sections
4. Supporting tables and diagrams descriptions
5. Sign-off blocks and appendices

## Best Practices
- Be precise and unambiguous
- Use consistent terminology
- Include all necessary details for implementation
- Reference supporting documentation',
  'file-text',
  true,
  true
),
(
  'Cost Estimation',
  'Project budgeting, material cost analysis, labour rate calculations, and comprehensive construction cost estimation with South African market rates.',
  'Financial',
  '# Cost Estimation Expert

## Expertise Areas
Comprehensive cost estimation for electrical and construction projects in the South African market.

## Cost Categories
1. **Materials**: Cable, equipment, fittings, consumables with current market rates
2. **Labour**: Installation rates, hourly costs, productivity factors
3. **Equipment**: Plant hire, tools, testing equipment
4. **Overheads**: Preliminaries, insurance, permits, professional fees
5. **Contingencies**: Risk allowances, escalation, provisional sums

## Estimation Methods
- Bottom-up detailed estimation
- Parametric estimation (cost per m², per point)
- Analogous estimation from similar projects
- Three-point estimation for uncertainty

## Output Format
- Itemized cost breakdowns
- Bill of Quantities structure
- Summary with subtotals and VAT
- Assumptions and exclusions clearly stated

## Market Considerations
- Current material price trends
- Regional labour rate variations
- Import duties and logistics costs
- Currency fluctuation allowances',
  'calculator',
  true,
  true
),
(
  'Code Compliance Checker',
  'Verify designs and installations against SANS standards, NEC/IEC codes, municipal bylaws, and industry best practices.',
  'Technical',
  '# Code Compliance Checker

## Standards Coverage
Expert verification against South African and international electrical standards.

## Primary Standards
1. **SANS 10142-1**: Wiring of Premises - Low Voltage
2. **SANS 10142-2**: Control of Electrical Installation Work
3. **SANS 10400**: National Building Regulations
4. **NRS 034**: Electricity Distribution - Guidelines
5. **IEC 60364**: Low-voltage Electrical Installations
6. **SANS 62305**: Lightning Protection

## Compliance Checks
- Installation methods and cable selection
- Circuit protection and discrimination
- Earthing and bonding requirements
- Emergency lighting and fire detection
- Energy efficiency requirements (SANS 204)
- Accessibility requirements

## Reporting Format
- Clause-by-clause compliance verification
- Non-conformance identification
- Remedial action recommendations
- Risk categorization (Critical/Major/Minor)

## Documentation Requirements
- Test certificates and records
- Completion certificates (COC)
- As-built drawings verification
- Maintenance schedules',
  'shield-check',
  true,
  true
),
(
  'Project Management',
  'Construction project planning, milestone tracking, resource allocation, timeline management, and progress monitoring assistance.',
  'Operations',
  '# Project Management Assistant

## Core Functions
Comprehensive project management support for construction and engineering projects.

## Planning Support
1. **WBS Development**: Work breakdown structure creation
2. **Scheduling**: Gantt charts, critical path analysis
3. **Resource Planning**: Labour, materials, equipment allocation
4. **Risk Management**: Identification, assessment, mitigation strategies

## Tracking & Monitoring
- Milestone tracking and progress reporting
- Earned value analysis
- Delay analysis and recovery planning
- Quality control checkpoints

## Communication
- Meeting agenda preparation
- Progress report templates
- Stakeholder communication plans
- Issue escalation procedures

## Documentation
- Project execution plans
- Method statements
- Quality management plans
- Health and safety plans

## Metrics & KPIs
- Schedule performance index (SPI)
- Cost performance index (CPI)
- Quality metrics
- Safety statistics',
  'folder-kanban',
  true,
  true
),
(
  'Safety Standards',
  'Occupational health and safety documentation, risk assessments, method statements, and PPE requirements for construction sites.',
  'Technical',
  '# Safety Standards Expert

## Regulatory Framework
Expert guidance on construction site safety per South African OHS Act and regulations.

## Key Legislation
1. **OHS Act 85 of 1993**: Occupational Health and Safety Act
2. **Construction Regulations 2014**: Specific construction requirements
3. **SANS 10400-T**: Fire protection
4. **Electrical Installation Regulations**: Working with electricity

## Documentation Types
1. **Risk Assessments**: Hazard identification and control measures
2. **Method Statements**: Safe work procedures
3. **Permits**: Hot work, confined space, excavation, isolation
4. **Training Records**: Competency verification
5. **Incident Reports**: Investigation and corrective actions

## Safety Categories
- Electrical safety and isolation procedures
- Working at heights
- Excavation and trenching
- Fire prevention
- Personal protective equipment (PPE)
- First aid and emergency procedures

## Compliance Requirements
- Health and Safety File contents
- Baseline risk assessments
- Fall protection plans
- Emergency evacuation procedures',
  'hard-hat',
  true,
  true
),
(
  'Technical Data Analysis',
  'Interpret engineering data, perform trend analysis, create technical reports, and provide data-driven insights for decision making.',
  'Analytics',
  '# Technical Data Analysis

## Analytical Capabilities
Expert analysis of engineering and construction data for informed decision-making.

## Data Types
1. **Electrical Data**: Load profiles, power quality, consumption patterns
2. **Project Data**: Cost tracking, schedule performance, resource utilization
3. **Quality Data**: Test results, defect rates, compliance metrics
4. **Safety Data**: Incident statistics, near-miss trends

## Analysis Methods
- Statistical analysis and trending
- Variance analysis
- Root cause analysis
- Predictive modelling
- Benchmarking against industry standards

## Visualization
- Charts and graphs interpretation
- Dashboard design recommendations
- Report formatting
- Executive summaries

## Reporting
- Data-driven insights
- Actionable recommendations
- Trend identification
- Performance comparisons

## Tools Integration
- Excel/spreadsheet analysis
- Database queries
- Power BI/reporting concepts
- Data validation techniques',
  'bar-chart-3',
  true,
  true
),
(
  'Contract & Claims Writing',
  'Draft variation orders, extension of time claims, contractual correspondence, and formal notices per JBCC/NEC/FIDIC contracts.',
  'Document',
  '# Contract & Claims Writing

## Contract Expertise
Professional drafting of contractual documents for construction projects.

## Contract Forms
1. **JBCC**: Joint Building Contracts Committee
2. **NEC**: New Engineering Contract
3. **FIDIC**: International Federation of Consulting Engineers
4. **GCC**: General Conditions of Contract

## Document Types
1. **Variation Orders**: Scope changes with cost and time implications
2. **EOT Claims**: Extension of time applications with justification
3. **Payment Certificates**: Progress claims and valuations
4. **Notices**: Contractual notices per required timelines
5. **Correspondence**: Formal letters and instructions

## Drafting Standards
- Clear identification of contractual clauses
- Precise language avoiding ambiguity
- Proper substantiation with records
- Timely submission per contract requirements

## Claim Elements
- Entitlement basis (contract clause)
- Causation (link between event and impact)
- Effect (time and cost impact)
- Supporting documentation

## Best Practices
- Maintain contemporaneous records
- Issue notices within prescribed periods
- Quantify claims with detailed breakdowns
- Reference relevant correspondence',
  'file-signature',
  true,
  true
);