// Utility to get the exact field order from the form schema
// This ensures the diff viewer matches the form structure exactly (sections + subsections)

import formSchema from "@/lib/enhanced-project-form.schema.json";

export interface FormFieldOrder {
  sectionId: string;
  sectionName: string;
  subsectionId?: string;
  subsectionName?: string;
  fieldId: string;
  fieldIndex: number;
}

/**
 * Gets the exact field order from the form schema, including subsections.
 * This matches the order fields appear in the EnhancedProjectForm.
 */
export function getFormFieldOrder(): FormFieldOrder[] {
  const schemaSteps = (formSchema as any).steps || [];
  const fieldOrder: FormFieldOrder[] = [];
  
  for (const step of schemaSteps) {
    const sectionId = step.id;
    const sectionName = step.title;
    
    // Check if step has subsections
    if (step.subsections && Array.isArray(step.subsections)) {
      // Has subsections - use subsection order
      for (const subsection of step.subsections) {
        const subsectionId = subsection.id;
        const subsectionName = subsection.title;
        
        if (subsection.fields && Array.isArray(subsection.fields)) {
          subsection.fields.forEach((fieldId: string, index: number) => {
            fieldOrder.push({
              sectionId,
              sectionName,
              subsectionId,
              subsectionName,
              fieldId,
              fieldIndex: index,
            });
          });
        }
      }
    } else if (step.fields && Array.isArray(step.fields)) {
      // No subsections - use step.fields order
      step.fields.forEach((fieldId: string, index: number) => {
        fieldOrder.push({
          sectionId,
          sectionName,
          fieldId,
          fieldIndex: index,
        });
      });
    }
  }
  
  return fieldOrder;
}

/**
 * Creates a map of fieldId -> order information for fast lookup
 */
export function getFieldOrderMap(): Map<string, { sectionId: string; subsectionId?: string; fieldIndex: number }> {
  const fieldOrder = getFormFieldOrder();
  const map = new Map();
  
  for (const item of fieldOrder) {
    map.set(item.fieldId, {
      sectionId: item.sectionId,
      subsectionId: item.subsectionId,
      fieldIndex: item.fieldIndex,
    });
  }
  
  return map;
}

/**
 * Gets subsection groupings for a section
 */
export function getSubsectionsForSection(sectionId: string): Array<{ id: string; name: string; fields: string[] }> {
  const schemaSteps = (formSchema as any).steps || [];
  const step = schemaSteps.find((s: any) => s.id === sectionId);
  
  if (!step || !step.subsections) {
    return [];
  }
  
  return step.subsections.map((subsection: any) => ({
    id: subsection.id,
    name: subsection.title,
    fields: subsection.fields || [],
  }));
}

