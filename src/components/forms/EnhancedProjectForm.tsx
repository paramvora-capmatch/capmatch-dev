// src/components/forms/EnhancedProjectForm.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react'; // Added useMemo
import { useRouter } from 'next/navigation';
import { FormWizard, Step } from '../ui/FormWizard';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Form, FormGroup } from '../ui/Form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select'; // Keep Select for States
import { Button } from '../ui/Button';
import { ButtonSelect } from '../ui/ButtonSelect'; // Import ButtonSelect
// Removed MultiSelect import if not used for project form fields directly
// import { MultiSelect } from '../ui/MultiSelect';
import { DocumentUpload } from '../ui/DocumentUpload';
import { useProjects } from '../../hooks/useProjects';
import { useBorrowerProfile } from '../../hooks/useBorrowerProfile';

import { useAuth } from '../../hooks/useAuth';
import { ContextHelp } from '../ui/ContextHelp';
import { FormProvider, useFormContext } from '../../contexts/FormContext';
import { AskAIButton } from '../ui/AskAIProvider';

import {
  FileText, MapPin, Building, DollarSign, Clock, CheckCircle,
  FileQuestion, CalendarClock, BarChart, Info // Added Info icon
} from 'lucide-react';
import {
  ProjectProfile, ProjectDocumentRequirement, ProjectStatus, ProjectPhase,
  InterestRateType, RecoursePreference, ExitStrategy
} from '../../types/enhanced-types';

interface EnhancedProjectFormProps {
  existingProject: ProjectProfile; // Made non-optional as workspace loads it
  onComplete?: (project: ProjectProfile) => void; // Make onComplete optional
  compact?: boolean; // Add compact prop
  onAskAI?: (fieldId: string) => void; // Add onAskAI prop
  onFormDataChange?: (formData: ProjectProfile) => void; // Add onFormDataChange prop
}

// Define options for ButtonSelect components
const assetTypeOptions = [ "Multifamily", "Office", "Retail", "Industrial", "Hospitality", "Land", "Mixed-Use", "Self-Storage", "Data Center", "Medical Office", "Senior Housing", "Student Housing", "Other" ];
const projectPhaseOptions: ProjectPhase[] = [ 'Acquisition', 'Refinance', 'Construction', 'Bridge', 'Development', 'Value-Add', 'Other' ];
const capitalTypeOptions = [ "Senior Debt", "Mezzanine", "Preferred Equity", "Common Equity", "JV Equity", "Other" ];
const interestRateTypeOptions: InterestRateType[] = [ 'Not Specified', 'Fixed', 'Floating' ];
const recourseOptions: RecoursePreference[] = [ 'Flexible', 'Full Recourse', 'Partial Recourse', 'Non-Recourse' ];
const exitStrategyOptions: ExitStrategy[] = [ 'Undecided', 'Sale', 'Refinance', 'Long-Term Hold' ];
const stateOptions = [ // Keep states for Select component
    { value: '', label: 'Select a state...' },
    { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' }, { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
    { value: 'DC', label: 'District of Columbia' },
];


export const EnhancedProjectForm: React.FC<EnhancedProjectFormProps> = ({
  existingProject,
  onComplete,
  compact = false,
  onAskAI,
  onFormDataChange
}) => {
  const router = useRouter();
  const { updateProject } = useProjects(); // Use updateProject


  // Form state initialized from existingProject prop
  const [formData, setFormData] = useState<ProjectProfile>(existingProject);
  const [formSaved, setFormSaved] = useState(false); // State for save button feedback
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);


  // Update local form state if the existingProject prop changes externally
  useEffect(() => {
    setFormData(existingProject);
    // Notify parent component of initial form data for AskAI
    onFormDataChange?.(existingProject);
  }, [existingProject, onFormDataChange]);

  // Debounced auto-save effect
  useEffect(() => {
    // This effect handles auto-saving. It runs whenever formData changes.
    // To prevent saving on every keystroke, it uses a debounce mechanism.

    // 1. Clear any existing timer. This is crucial. If the user types again
    //    within the timeout period, the previous save is cancelled.
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // 2. Set a new timer to trigger the save after a delay (e.g., 2 seconds).
    debounceTimeout.current = setTimeout(async () => {
      // 3. Before saving, check if there are actual changes compared to the initial prop.
      //    This prevents saving if the component re-renders without data changes.
      if (JSON.stringify(formData) !== JSON.stringify(existingProject)) {
        try {
          console.log(`[ProjectForm] Auto-saving project: ${formData.projectName}`);
          // 4. Call the updateProject action from the store with the latest form data.
          await updateProject(formData.id, formData);
        } catch (error) {
          console.error('[ProjectForm] Auto-save failed:', error);
        }
      }
    }, 2000); // 2-second debounce delay

    // 5. Cleanup: When the component unmounts or dependencies change,
    //    clear the timeout to prevent memory leaks or unwanted saves.
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [formData, existingProject, updateProject]);

  // Handle form field changes
  const handleInputChange = (field: keyof ProjectProfile, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    // Notify parent component of form data changes for AskAI
    onFormDataChange?.(newFormData);
  };

  // Handle form submission (manual save via button)
  const handleFormSubmit = async () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    try {
        setFormSaved(true); // Indicate loading/saving
        await updateProject(formData.id, formData);
        console.log('Project changes manually saved.');
        if (onComplete) {
            // Pass the current formData state which reflects the latest changes
            onComplete(formData);
        }

    } catch (error) {
        console.error('Error saving project:', error);
        console.error('Failed to save project.');
    } finally {
         // Reset saved indicator after a short delay
        setTimeout(() => setFormSaved(false), 2000);
    }
  };


  // --- Define Steps for FormWizard ---
  const steps: Step[] = useMemo(() => [ // Use useMemo to prevent re-creation on every render
    // --- Step 1: Basic Information ---
    {
      id: 'basic-info',
      title: 'Basic Info',
      component: (
        <Card>
          <CardHeader className="pb-3 border-b">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" /> Project Information
            </h2>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <FormGroup> 
              <AskAIButton id="projectName" onAskAI={onAskAI || (() => {})}>
                <Input 
                  id="projectName" 
                  label="Project Name" 
                  value={formData.projectName || ''} 
                  onChange={(e) => handleInputChange('projectName', e.target.value)} 
                  placeholder="e.g., Riverfront Acquisition" 
                  required 
                  data-field-id="projectName"
                  data-field-type="input"
                  data-field-section="basic-info"
                  data-field-required="true"
                  data-field-label="Project Name"
                  data-field-placeholder="e.g., Riverfront Acquisition"
                />
              </AskAIButton>
            </FormGroup>
            {/* Property Address Section */}
            <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center"><MapPin className="h-4 w-4 mr-2 text-blue-600" /> Property Address</h3>
                <FormGroup> 
                                <AskAIButton id="propertyAddressStreet" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="propertyAddressStreet" 
                      label="Street Address" 
                      value={formData.propertyAddressStreet || ''} 
                      onChange={(e) => handleInputChange('propertyAddressStreet', e.target.value)} 
                      placeholder="123 Main Street" 
                      required 
                      data-field-id="propertyAddressStreet"
                      data-field-type="input"
                      data-field-section="basic-info"
                      data-field-required="true"
                      data-field-label="Street Address"
                      data-field-placeholder="123 Main Street"
                    />
                  </AskAIButton>
                </FormGroup>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormGroup> 
                      <AskAIButton id="propertyAddressCity" onAskAI={onAskAI || (() => {})}>
                        <Input 
                          id="propertyAddressCity" 
                          label="City" 
                          value={formData.propertyAddressCity || ''} 
                          onChange={(e) => handleInputChange('propertyAddressCity', e.target.value)} 
                          placeholder="Anytown" 
                          required 
                          data-field-id="propertyAddressCity"
                          data-field-type="input"
                          data-field-section="basic-info"
                          data-field-required="true"
                          data-field-label="City"
                          data-field-placeholder="Anytown"
                        />
                      </AskAIButton>
                    </FormGroup>
                    {/* State uses Select */}
                    <FormGroup> 
                                             <AskAIButton id="propertyAddressState" onAskAI={onAskAI || (() => {})}>
                        <Select 
                          id="propertyAddressState" 
                          label="State" 
                          value={formData.propertyAddressState || ''} 
                          onChange={(e) => handleInputChange('propertyAddressState', e.target.value)} 
                          options={stateOptions} 
                          required 
                          data-field-id="propertyAddressState"
                          data-field-type="select"
                          data-field-section="basic-info"
                          data-field-required="true"
                          data-field-label="State"
                          data-field-options={JSON.stringify(stateOptions)}
                        />
                      </AskAIButton>
                    </FormGroup>
                    <FormGroup> 
                      <AskAIButton id="propertyAddressZip" onAskAI={onAskAI || (() => {})}>
                        <Input 
                          id="propertyAddressZip" 
                          label="ZIP Code" 
                          value={formData.propertyAddressZip || ''} 
                          onChange={(e) => handleInputChange('propertyAddressZip', e.target.value)} 
                          placeholder="12345" 
                          required 
                          data-field-id="propertyAddressZip"
                          data-field-type="input"
                          data-field-section="basic-info"
                          data-field-required="true"
                          data-field-label="ZIP Code"
                          data-field-placeholder="12345"
                        />
                      </AskAIButton>
                    </FormGroup>
                </div>
                                  <FormGroup className="mt-4"> 
                    <AskAIButton id="propertyAddressCounty" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="propertyAddressCounty" 
                      label="County" 
                      value={formData.propertyAddressCounty || ''} 
                      onChange={(e) => handleInputChange('propertyAddressCounty', e.target.value)} 
                      placeholder="e.g., Orange County" 
                      data-field-id="propertyAddressCounty"
                      data-field-type="input"
                      data-field-section="basic-info"
                      data-field-required="false"
                      data-field-label="County"
                      data-field-placeholder="e.g., Orange County"
                    />
                  </AskAIButton>
                </FormGroup>
            </div>
             {/* Property Info Section */}
            <div className="border-t pt-4">
                 <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center"><Building className="h-4 w-4 mr-2 text-blue-600" /> Property Information</h3>
                 {/* Asset Type uses ButtonSelect */}
                                    <FormGroup> 
                    <AskAIButton id="assetType" onAskAI={onAskAI || (() => {})}>
                     <div
                       data-field-id="assetType"
                       data-field-type="button-select"
                       data-field-section="basic-info"
                       data-field-required="true"
                       data-field-label="Asset Type"
                       data-field-options={JSON.stringify(assetTypeOptions)}
                     >
                       <ButtonSelect 
                         label="Asset Type" 
                         options={assetTypeOptions} 
                         selectedValue={formData.assetType || ''} 
                         onSelect={(value) => handleInputChange('assetType', value)} 
                         required 
                       />
                     </div>
                   </AskAIButton>
                 </FormGroup>
                 {/* Project Phase uses ButtonSelect */}
                                    <FormGroup className="mt-4"> 
                    <AskAIButton id="projectPhase" onAskAI={onAskAI || (() => {})}>
                     <div
                       data-field-id="projectPhase"
                       data-field-type="button-select"
                       data-field-section="basic-info"
                       data-field-required="true"
                       data-field-label="Project Phase / Deal Type"
                       data-field-options={JSON.stringify(projectPhaseOptions)}
                     >
                       <ButtonSelect 
                         label="Project Phase / Deal Type" 
                         options={projectPhaseOptions} 
                         selectedValue={formData.projectPhase || ''} 
                         onSelect={(value) => handleInputChange('projectPhase', value as ProjectPhase)} 
                         required 
                       />
                     </div>
                   </AskAIButton>
                 </FormGroup>
                 {/* Project Description uses Textarea */}
                                    <FormGroup className="mt-4"> 
                    <AskAIButton id="projectDescription" onAskAI={onAskAI || (() => {})}>
                     <div
                       data-field-id="projectDescription"
                       data-field-type="textarea"
                       data-field-section="basic-info"
                       data-field-required="true"
                       data-field-label="Project Description"
                       data-field-placeholder="Brief description of the project..."
                     >
                       <label className="block text-sm font-medium text-gray-700 mb-1"> Project Description </label>
                       <textarea 
                         id="projectDescription" 
                         value={formData.projectDescription || ''} 
                         onChange={(e) => handleInputChange('projectDescription', e.target.value)} 
                         placeholder="Brief description of the project..." 
                         className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                         required 
                       />
                     </div>
                   </AskAIButton>
                 </FormGroup>
            </div>
          </CardContent>
        </Card>
      ),
    },
    // --- Step 2: Loan Information ---
     {
      id: 'loan-info',
      title: 'Loan Info',
      component: (
        <Card>
          <CardHeader className="pb-3 border-b"> <h2 className="text-xl font-semibold text-gray-800 flex items-center"><DollarSign className="h-5 w-5 mr-2 text-blue-600" /> Loan Request Details</h2> </CardHeader>
          <CardContent className="p-4 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <FormGroup> 
                   <AskAIButton id="loanAmountRequested" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="loanAmountRequested" 
                      type="number" 
                      label="Requested Loan Amount ($)" 
                      value={formData.loanAmountRequested?.toString() || ''} 
                      onChange={(e) => handleInputChange('loanAmountRequested', e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g., 10000000" 
                      required 
                      data-field-id="loanAmountRequested"
                      data-field-type="number"
                      data-field-section="loan-info"
                      data-field-required="true"
                      data-field-label="Requested Loan Amount ($)"
                      data-field-placeholder="e.g., 10000000"
                    />
                  </AskAIButton>
                </FormGroup>
                 {/* Capital Type uses ButtonSelect */}
                                                                    <FormGroup> 
                    <AskAIButton id="loanType" onAskAI={onAskAI || (() => {})}>
                     <div
                       data-field-id="loanType"
                       data-field-type="button-select"
                       data-field-section="loan-info"
                       data-field-required="true"
                       data-field-label="Capital Type"
                       data-field-options={JSON.stringify(capitalTypeOptions)}
                     >
                       <ButtonSelect 
                         label="Capital Type" 
                         options={capitalTypeOptions} 
                         selectedValue={formData.loanType || ''} 
                         onSelect={(value) => handleInputChange('loanType', value)} 
                         required 
                         gridCols="grid-cols-2 md:grid-cols-3" 
                       />
                     </div>
                   </AskAIButton>
                 </FormGroup>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <FormGroup> 
                   <AskAIButton id="targetLtvPercent" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="targetLtvPercent" 
                      type="number" 
                      label="Target LTV (%)" 
                      value={formData.targetLtvPercent?.toString() || ''} 
                      onChange={(e) => handleInputChange('targetLtvPercent', e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g., 70" 
                      required 
                      data-field-id="targetLtvPercent"
                      data-field-type="number"
                      data-field-section="loan-info"
                      data-field-required="true"
                      data-field-label="Target LTV (%)"
                      data-field-placeholder="e.g., 70"
                    />
                  </AskAIButton>
                </FormGroup>
                                  <FormGroup> 
                   <AskAIButton id="targetLtcPercent" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="targetLtcPercent" 
                      type="number" 
                      label="Target LTC (%) (Construction/Dev)" 
                      value={formData.targetLtcPercent?.toString() || ''} 
                      onChange={(e) => handleInputChange('targetLtcPercent', e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g., 80" 
                      data-field-id="targetLtcPercent"
                      data-field-type="number"
                      data-field-section="loan-info"
                      data-field-required="false"
                      data-field-label="Target LTC (%) (Construction/Dev)"
                      data-field-placeholder="e.g., 80"
                    />
                  </AskAIButton>
                </FormGroup>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <FormGroup> 
                   <AskAIButton id="amortizationYears" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="amortizationYears" 
                      type="number" 
                      label="Amortization (Years)" 
                      value={formData.amortizationYears?.toString() || ''} 
                      onChange={(e) => handleInputChange('amortizationYears', e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g., 30" 
                      data-field-id="amortizationYears"
                      data-field-type="number"
                      data-field-section="loan-info"
                      data-field-required="false"
                      data-field-label="Amortization (Years)"
                      data-field-placeholder="e.g., 30"
                    />
                  </AskAIButton>
                </FormGroup>
                                  <FormGroup> 
                   <AskAIButton id="interestOnlyPeriodMonths" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="interestOnlyPeriodMonths" 
                      type="number" 
                      label="Interest-Only Period (Months)" 
                      value={formData.interestOnlyPeriodMonths?.toString() || ''} 
                      onChange={(e) => handleInputChange('interestOnlyPeriodMonths', e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g., 36" 
                      data-field-id="interestOnlyPeriodMonths"
                      data-field-type="number"
                      data-field-section="loan-info"
                      data-field-required="false"
                      data-field-label="Interest-Only Period (Months)"
                      data-field-placeholder="e.g., 36"
                    />
                  </AskAIButton>
                </FormGroup>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Interest Rate Type uses ButtonSelect */}
                                   <FormGroup> 
                    <AskAIButton id="interestRateType" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="interestRateType"
                      data-field-type="button-select"
                      data-field-section="loan-info"
                      data-field-required="false"
                      data-field-label="Interest Rate Type"
                      data-field-options={JSON.stringify(interestRateTypeOptions)}
                    >
                      <ButtonSelect 
                        label="Interest Rate Type" 
                        options={interestRateTypeOptions} 
                        selectedValue={formData.interestRateType || 'Not Specified'} 
                        onSelect={(value) => handleInputChange('interestRateType', value as InterestRateType)} 
                        gridCols="grid-cols-2 md:grid-cols-3" 
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                                  <FormGroup> 
                   <AskAIButton id="targetCloseDate" onAskAI={onAskAI || (() => {})}>
                    <Input 
                      id="targetCloseDate" 
                      type="date" 
                      label="Target Close Date" 
                      value={formData.targetCloseDate || ''} 
                      onChange={(e) => handleInputChange('targetCloseDate', e.target.value)} 
                      data-field-id="targetCloseDate"
                      data-field-type="date"
                      data-field-section="loan-info"
                      data-field-required="false"
                      data-field-label="Target Close Date"
                    />
                  </AskAIButton>
                </FormGroup>
             </div>
             {/* Recourse Preference uses ButtonSelect */}
                            <FormGroup> 
                <AskAIButton id="recoursePreference" onAskAI={onAskAI || (() => {})}>
                 <div
                   data-field-id="recoursePreference"
                   data-field-type="button-select"
                   data-field-section="loan-info"
                   data-field-required="false"
                   data-field-label="Recourse Preference"
                   data-field-options={JSON.stringify(recourseOptions)}
                 >
                   <ButtonSelect 
                     label="Recourse Preference" 
                     options={recourseOptions} 
                     selectedValue={formData.recoursePreference || 'Flexible'} 
                     onSelect={(value) => handleInputChange('recoursePreference', value as RecoursePreference)} 
                     gridCols="grid-cols-2 md:grid-cols-3" 
                   />
                 </div>
               </AskAIButton>
             </FormGroup>
                                         {/* Use of Proceeds uses Textarea */}
                              <FormGroup> 
                 <AskAIButton id="useOfProceeds" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="useOfProceeds"
                    data-field-type="textarea"
                    data-field-section="loan-info"
                    data-field-required="true"
                    data-field-label="Use of Proceeds"
                    data-field-placeholder="Describe how the loan proceeds will be used..."
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1"> Use of Proceeds </label>
                    <textarea 
                      id="useOfProceeds" 
                      value={formData.useOfProceeds || ''} 
                      onChange={(e) => handleInputChange('useOfProceeds', e.target.value)} 
                      placeholder="Describe how the loan proceeds will be used..." 
                      className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      required 
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
            </CardContent>
        </Card>
      ),
    },
     // --- Step 3: Financial Information ---
     {
      id: 'financials',
      title: 'Financials',
      component: (
        <Card>
          <CardHeader className="pb-3 border-b"> <h2 className="text-xl font-semibold text-gray-800 flex items-center"><BarChart className="h-5 w-5 mr-2 text-blue-600" /> Financial Information</h2> </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormGroup> 
                 <AskAIButton id="purchasePrice" onAskAI={onAskAI || (() => {})}>
                  <Input 
                    id="purchasePrice" 
                    type="number" 
                    label="Purchase Price / Current Basis ($)" 
                    value={formData.purchasePrice?.toString() || ''} 
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value ? Number(e.target.value) : null)} 
                    placeholder="e.g., 15000000" 
                    data-field-id="purchasePrice"
                    data-field-type="number"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="Purchase Price / Current Basis ($)"
                    data-field-placeholder="e.g., 15000000"
                  />
                </AskAIButton>
              </FormGroup>
                              <FormGroup> 
                 <AskAIButton id="totalProjectCost" onAskAI={onAskAI || (() => {})}>
                  <Input 
                    id="totalProjectCost" 
                    type="number" 
                    label="Total Project Cost ($)" 
                    value={formData.totalProjectCost?.toString() || ''} 
                    onChange={(e) => handleInputChange('totalProjectCost', e.target.value ? Number(e.target.value) : null)} 
                    placeholder="e.g., 18000000" 
                    data-field-id="totalProjectCost"
                    data-field-type="number"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="Total Project Cost ($)"
                    data-field-placeholder="e.g., 18000000"
                  />
                </AskAIButton>
              </FormGroup>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormGroup> 
                 <AskAIButton id="capexBudget" onAskAI={onAskAI || (() => {})}>
                  <Input 
                    id="capexBudget" 
                    type="number" 
                    label="CapEx Budget ($)" 
                    value={formData.capexBudget?.toString() || ''} 
                    onChange={(e) => handleInputChange('capexBudget', e.target.value ? Number(e.target.value) : null)} 
                    placeholder="e.g., 1500000" 
                    data-field-id="capexBudget"
                    data-field-type="number"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="CapEx Budget ($)"
                    data-field-placeholder="e.g., 1500000"
                  />
                </AskAIButton>
              </FormGroup>
                              <FormGroup> 
                 <AskAIButton id="equityCommittedPercent" onAskAI={onAskAI || (() => {})}>
                  <Input 
                    id="equityCommittedPercent" 
                    type="number" 
                    label="Equity Committed (%)" 
                    value={formData.equityCommittedPercent?.toString() || ''} 
                    onChange={(e) => handleInputChange('equityCommittedPercent', e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g., 100" 
                    data-field-id="equityCommittedPercent"
                    data-field-type="number"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="Equity Committed (%)"
                    data-field-placeholder="e.g., 100"
                  />
                </AskAIButton>
              </FormGroup>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormGroup> 
                  <AskAIButton id="propertyNoiT12" onAskAI={onAskAI || (() => {})}>
                   <Input 
                     id="propertyNoiT12" 
                     type="number" 
                     label="Current/T12 NOI ($)" 
                     value={formData.propertyNoiT12?.toString() || ''} 
                     onChange={(e) => handleInputChange('propertyNoiT12', e.target.value ? Number(e.target.value) : null)}
                     placeholder="e.g., 450000" 
                     data-field-id="propertyNoiT12"
                     data-field-type="number"
                     data-field-section="financials"
                     data-field-required="false"
                     data-field-label="Current/T12 NOI ($)"
                     data-field-placeholder="e.g., 450000"
                   />
                 </AskAIButton>
               </FormGroup>
                                <FormGroup> 
                  <AskAIButton id="stabilizedNoiProjected" onAskAI={onAskAI || (() => {})}>
                   <Input 
                     id="stabilizedNoiProjected" 
                     type="number" 
                     label="Projected Stabilized NOI ($)" 
                     value={formData.stabilizedNoiProjected?.toString() || ''} 
                     onChange={(e) => handleInputChange('stabilizedNoiProjected', e.target.value ? Number(e.target.value) : null)}
                     placeholder="e.g., 750000" 
                     data-field-id="stabilizedNoiProjected"
                     data-field-type="number"
                     data-field-section="financials"
                     data-field-required="false"
                     data-field-label="Projected Stabilized NOI ($)"
                     data-field-placeholder="e.g., 750000"
                   />
                 </AskAIButton>
               </FormGroup>
             </div>
             {/* Exit Strategy uses ButtonSelect */}
                            <FormGroup> 
                <AskAIButton id="exitStrategy" onAskAI={onAskAI || (() => {})}>
                 <div
                   data-field-id="exitStrategy"
                   data-field-type="button-select"
                   data-field-section="financials"
                   data-field-required="false"
                   data-field-label="Exit Strategy"
                   data-field-options={JSON.stringify(exitStrategyOptions)}
                 >
                   <ButtonSelect 
                     label="Exit Strategy" 
                     options={exitStrategyOptions} 
                     selectedValue={formData.exitStrategy || 'Undecided'} 
                     onSelect={(value) => handleInputChange('exitStrategy', value as ExitStrategy)} 
                   />
                 </div>
               </AskAIButton>
             </FormGroup>
             {/* Business Plan & Market Overview use Textarea */}
                            <FormGroup> 
                <AskAIButton id="businessPlanSummary" onAskAI={onAskAI || (() => {})}>
                 <div
                   data-field-id="businessPlanSummary"
                   data-field-type="textarea"
                   data-field-section="financials"
                   data-field-required="false"
                   data-field-label="Business Plan Summary"
                   data-field-placeholder="Summary of your business plan..."
                 >
                   <label className="block text-sm font-medium text-gray-700 mb-1"> Business Plan Summary </label>
                   <textarea 
                     id="businessPlanSummary" 
                     value={formData.businessPlanSummary || ''} 
                     onChange={(e) => handleInputChange('businessPlanSummary', e.target.value)} 
                     placeholder="Summary of your business plan..." 
                     className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                   />
                 </div>
               </AskAIButton>
             </FormGroup>
                            <FormGroup> 
                <AskAIButton id="marketOverviewSummary" onAskAI={onAskAI || (() => {})}>
                 <div
                   data-field-id="marketOverviewSummary"
                   data-field-type="textarea"
                   data-field-section="financials"
                   data-field-required="false"
                   data-field-label="Market Overview"
                   data-field-placeholder="Brief overview of the market..."
                 >
                   <label className="block text-sm font-medium text-gray-700 mb-1"> Market Overview </label>
                   <textarea 
                     id="marketOverviewSummary" 
                     value={formData.marketOverviewSummary || ''} 
                     onChange={(e) => handleInputChange('marketOverviewSummary', e.target.value)} 
                     placeholder="Brief overview of the market..." 
                     className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                   />
                 </div>
               </AskAIButton>
             </FormGroup>
          </CardContent>
        </Card>
      ),
    },
     // --- Step 4: Documents --- (Simplified view, actual upload logic TBD)
     {
      id: 'documents',
      title: 'Documents',
      component: (
        <Card>
          <CardHeader className="pb-3 border-b"> <h2 className="text-xl font-semibold text-gray-800 flex items-center"><FileQuestion className="h-5 w-5 mr-2 text-blue-600" /> Required Documents</h2> </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex items-start space-x-2">
                <Info size={18} className="flex-shrink-0 mt-0.5"/>
                <span>Upload relevant documents here or later via the document manager. Providing key documents now (like PFS, Rent Roll, Operating Statements) can expedite the matching process.</span>
            </div>
            {/* Simplified list - Replace with actual DocumentUpload components if needed */}
            <p className="text-gray-600">Document upload section placeholder. Common requirements:</p>
            <ul className="list-disc list-inside text-sm text-gray-500 pl-4 space-y-1">
                <li>Personal Financial Statement (PFS)</li>
                <li>Schedule of Real Estate Owned (SREO)</li>
                <li>Rent Roll (if applicable)</li>
                <li>Operating Statements (T-12 / T-3)</li>
                <li>Pro Forma / Budget</li>
                <li>Purchase Agreement (if Acquisition)</li>
            </ul>
             <Button onClick={() => router.push(`/project/documents/${formData.id}`)} variant="outline">Manage Documents</Button>
          </CardContent>
        </Card>
      ),
    },
    // --- Step 5: Review & Submit ---
     {
      id: 'review',
      title: 'Review',
      component: (
        <Card>
          <CardHeader className="pb-3 border-b"> <h2 className="text-xl font-semibold text-gray-800 flex items-center"><CheckCircle className="h-5 w-5 mr-2 text-blue-600" /> Review & Save</h2> </CardHeader>
          <CardContent className="p-4 space-y-6">
             <p className="text-gray-700">Review the information entered. Your project auto-saves, but you can manually save changes below.</p>
             {/* Add a summary display of formData if needed */}
             {/* ... Summary ... */}
             <div className="flex justify-center mt-6">
                 <Button variant="primary" onClick={handleFormSubmit} isLoading={formSaved} disabled={formSaved} className="min-w-[120px]">
                     {formSaved ? 'Saved!' : 'Save Changes'}
                 </Button>
             </div>
             <p className="text-center text-xs text-gray-500 mt-2">Your advisor will be notified of significant updates.</p>
          </CardContent>
        </Card>
      ),
    },
  ], [formData, formSaved, handleInputChange, handleFormSubmit, router]); // Include dependencies for useMemo

  return (
    <FormProvider initialFormData={formData}>
      <FormWizard
        steps={steps}
        onComplete={handleFormSubmit} // Trigger save on final step if needed
        showProgressBar={true}
        showStepIndicators={true}
        allowSkip={true} // Allow skipping optional steps
      />
    </FormProvider>
  );
};