// lib/enhancedMockApiService.ts
import { LenderProfile } from "../src/types/lender";
import {
  BorrowerProfile,
  Principal,
  ProjectProfile,
  Advisor,
  ProjectMessage,
} from "../src/types/enhanced-types";

// Get lenders data from existing mock service
export const getLenders = async (): Promise<LenderProfile[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Import the existing mock data
  return (await import("./mockApiService")).getLenders();
};

// Get a single lender by ID
export const getLenderById = async (
  id: number
): Promise<LenderProfile | null> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const lenders = await getLenders();
  return lenders.find((lender) => lender.lender_id === id) || null;
};

// Get advisors (mock data)
export const getAdvisors = async (): Promise<Advisor[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Return mock advisors
  return [
    {
      id: "advisor1",
      userId: "advisor1@capmatch.com",
      name: "Sarah Adams",
      title: "Senior Capital Advisor",
      email: "sarah.adams@capmatch.com",
      phone: "(555) 123-4567",
      bio: "Sarah has over 15 years of experience in commercial real estate financing, specializing in multifamily and retail assets.",
      avatar: "/avatars/sarah.jpg",
      specialties: ["Multifamily", "Retail", "Bridge Financing"],
      yearsExperience: 15,
      createdAt: "2023-01-15T12:00:00Z",
      updatedAt: "2023-01-15T12:00:00Z",
    },
    {
      id: "advisor2",
      userId: "advisor2@capmatch.com",
      name: "Michael Chen",
      title: "Capital Markets Director",
      email: "michael.chen@capmatch.com",
      phone: "(555) 234-5678",
      bio: "Michael specializes in structuring complex financing solutions for office, industrial and mixed-use developments.",
      avatar: "/avatars/michael.jpg",
      specialties: ["Office", "Industrial", "Construction Financing"],
      yearsExperience: 12,
      createdAt: "2023-02-20T12:00:00Z",
      updatedAt: "2023-02-20T12:00:00Z",
    },
    {
      id: "advisor3",
      userId: "advisor3@capmatch.com",
      name: "Jessica Williams",
      title: "Executive Capital Advisor",
      email: "jessica.williams@capmatch.com",
      phone: "(555) 345-6789",
      bio: "Jessica has extensive experience in hotel and hospitality financing, as well as senior housing developments.",
      avatar: "/avatars/jessica.jpg",
      specialties: ["Hospitality", "Senior Housing", "Mezzanine Debt"],
      yearsExperience: 18,
      createdAt: "2023-03-10T12:00:00Z",
      updatedAt: "2023-03-10T12:00:00Z",
    },
  ];
};

// Get a specific advisor by ID
export const getAdvisorById = async (id: string): Promise<Advisor | null> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const advisors = await getAdvisors();
  return (
    advisors.find((advisor) => advisor.id === id || advisor.userId === id) ||
    null
  );
};

// Mock auto message generation
export const generateAdvisorMessage = async (
  advisorId: string,
  projectId: string,
  context: {
    assetType?: string;
    dealType?: string;
    loanAmount?: number;
    stage?: string;
  }
): Promise<string> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Get the advisor
  const advisor = await getAdvisorById(advisorId);

  if (!advisor) {
    return "Hello! I'm your Capital Markets Advisor. How can I help with your project today?";
  }

  // Create a personalized message based on context
  if (context.assetType && context.dealType) {
    return `Hello! I'm ${
      advisor.name
    }, your dedicated Capital Markets Advisor at CapMatch. 
    I see you're working on a ${context.assetType} ${context.dealType} project${
      context.loanAmount
        ? ` with a target loan amount of $${(
            context.loanAmount / 1000000
          ).toFixed(1)}M`
        : ""
    }. 
    As a specialist in ${advisor.specialties.join(
      ", "
    )}, I'm excited to help you find the perfect financing solution. 
    Please complete your Project Resume so we can match you with the ideal capital providers. Let me know if you have any questions!`;
  } else {
    return `Hello! I'm ${advisor.name}, your dedicated Capital Markets Advisor at CapMatch with ${advisor.yearsExperience} years of experience.
    I'm here to help you find the ideal financing for your commercial real estate project. 
    Please complete your Project Resume so we can match you with suitable lenders. 
    Don't hesitate to reach out if you have any questions or need assistance.`;
  }
};

// Mock API for automated feedback
export const generateProjectFeedback = async (
  projectId: string,
  project: Partial<ProjectProfile>
): Promise<string> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Calculate completeness score
  let completenessScore = 0;
  let totalFields = 0;

  const requiredFields: (keyof ProjectProfile)[] = [
    "projectName",
    "propertyAddressStreet",
    "propertyAddressCity",
    "propertyAddressState",
    "propertyAddressZip",
    "assetType",
    "projectDescription",
    "loanAmountRequested",
    "targetLtvPercent",
    "useOfProceeds",
    "exitStrategy",
  ];

  for (const field of requiredFields) {
    totalFields++;
    if (
      project[field] &&
      (typeof project[field] === "string" ? project[field] !== "" : true)
    ) {
      completenessScore++;
    }
  }

  const completenessPercent = Math.round(
    (completenessScore / totalFields) * 100
  );

  // Generate feedback based on completeness
  if (completenessPercent < 50) {
    return "I've reviewed your project information, and it looks like we still need quite a bit more detail before we can match you with lenders. Could you please fill out more of the Project Resume? Focus on the property details, loan amount, and basic financial information.";
  } else if (completenessPercent < 80) {
    return "Thanks for providing the project details so far. We're making good progress, but to get the best lender matches, we should fill in some of the remaining information. Could you add more about your exit strategy and business plan? Also, any additional financial details would be helpful.";
  } else {
    return "I've reviewed your project details, and you've provided excellent information! We have everything we need to start matching you with lenders who specialize in your property type and deal structure. I'll begin that process now and update you soon with potential matches.";
  }
};
