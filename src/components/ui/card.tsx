// components/ui/card.tsx
import React from 'react';
import { cn } from '../../utils/cn';
import { DataSourceTooltip } from '@/components/om/DataSourceTooltip';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 transition-shadow duration-200 hover:shadow-md", 
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  dataSourceFields?: string | string[];
  dataSourceSection?: string;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, dataSourceFields, dataSourceSection, ...props }, ref) => {
    const hasTooltip = dataSourceFields || dataSourceSection;
    
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)}
        {...props}
      >
        {hasTooltip ? (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">{children}</div>
            <div className="flex-shrink-0 mt-1">
              <DataSourceTooltip
                fields={dataSourceFields}
                sectionName={dataSourceSection}
                placement="top"
                iconSize={16}
              />
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex justify-end p-6 pt-0", className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };