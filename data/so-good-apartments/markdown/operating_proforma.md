```csv
Category,Subcategory,Metric_Type,Year_1_Value,Year_2_Value,Year_3_Value,Year_4_Value,Year_5_Value,Growth_Rate_Annual_%,Notes
Assumptions,Project Name,Text,So-Good Apartments,,,,,,
Assumptions,Location,Text,Springfield,,,,,,
Assumptions,Unit Count,Units,300,300,300,300,300,,
Assumptions,Total Development Cost,$,65000000.00,,,,,,Initial project cost
Assumptions,Avg. Initial Rent per Unit,$/Unit,$1800.00,,,,3.00%,Starting average rent per unit
Assumptions,Rent Growth Rate,%,,3.00%,,,,,Annual increase applied to GPR
Assumptions,Vacancy Rate (Physical),%,,5.00%,,,,,Percentage of GPR lost to vacancy
Assumptions,Concessions Rate,%,,1.00%,,,,,Percentage of GPR lost to concessions
Assumptions,Bad Debt Rate,%,,0.50%,,,,,Percentage of GPR lost to uncollectible rent
Assumptions,Other Income Growth Rate,%,,2.00%,,,,,Annual increase for most Other Income line items
Assumptions,Operating Expense Growth Rate,%,,2.50%,,,,,Annual increase for most Operating Expense line items
Assumptions,Property Management Fee Rate,%,,4.00%,,,,,Percentage of Effective Gross Revenue (EGR)
Assumptions,Reserves for Replacement per Unit,$/Unit,$300.00,,,,2.50%,Initial annual reserve per unit, then grows with OpEx growth
Assumptions,Real Estate Tax Assessment Value (Stabilized),$,50000000.00,,,,,,Assumed assessed value for tax calculation
Assumptions,Real Estate Tax Rate,%,,1.50%,,,,,Applied to Assessed Value for Y1, then grows with OpEx growth
Assumptions,Property Insurance Cost per Unit,$/Unit,$400.00,,,,2.50%,Initial annual insurance per unit, then grows with OpEx growth
Revenue,Gross Potential Rent (GPR),Total Annual,$6480000.00,$6674400.00,$6874632.00,$7081870.00,$7296326.16,3.00%,"Unit Count * Avg Rent/Unit * 12, grows by Rent Growth Rate"
Revenue,Less: Physical Vacancy Loss,Total Annual,$324000.00,$333720.00,$343731.60,$354043.55,$364664.86,3.00%,"GPR * Vacancy Rate, grows with GPR"
Revenue,Less: Concessions Loss,Total Annual,$64800.00,$66744.00,$68746.32,$70818.70,$72963.26,3.00%,"GPR * Concessions Rate, grows with GPR"
Revenue,Less: Bad Debt Loss,Total Annual,$32400.00,$33372.00,$34373.16,$35404.35,$36466.33,3.00%,"GPR * Bad Debt Rate, grows with GPR"
Revenue,Effective Gross Revenue (EGR),Total Annual,$6058800.00,$6240564.00,$6427780.92,$6621603.40,$6822231.71,3.00%,"GPR - Vacancy - Concessions - Bad Debt"
Revenue,Other Income: Laundry,Total Annual,$15000.00,$15300.00,$15606.00,$15918.12,$16236.48,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Pet Rent,Total Annual,$54000.00,$55080.00,$56181.60,$57305.23,$58451.34,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Parking Fees,Total Annual,$20000.00,$20400.00,$20808.00,$21224.16,$21648.64,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Application Fees,Total Annual,$10000.00,$10200.00,$10404.00,$10612.08,$10824.32,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Amenity Fees,Total Annual,$30000.00,$30600.00,$31212.00,$31836.24,$32472.96,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Storage Fees,Total Annual,$12000.00,$12240.00,$12484.80,$12734.49,$12989.18,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Utility Reimbursement,Total Annual,$75000.00,$76500.00,$78030.00,$79590.60,$81182.41,2.00%,Grows by Other Income Growth Rate
Revenue,Other Income: Late Fees,Total Annual,$8000.00,$8160.00,$8323.20,$8489.66,$8659.46,2.00%,Grows by Other Income Growth Rate
Revenue,Total Other Income,Total Annual,$224000.00,$228480.00,$232977.00,$237710.58,$242464.79,2.00%,Sum of all Other Income items
Revenue,Gross Operating Income (GOI),Total Annual,$6282800.00,$6469044.00,$6660757.92,$6859313.98,$7064696.50,2.96%,"EGR + Total Other Income"
Operating Expenses,Property Management Fees,Total Annual,$242352.00,$249622.56,$257111.24,$264824.08,$272768.80,3.00%,"EGR * Property Management Fee Rate, grows with EGR"
Operating Expenses,Real Estate Taxes,Total Annual,$750000.00,$768750.00,$788006.25,$807706.41,$827907.07,2.50%,"Assessment Value * Tax Rate (Y1), then grows by OpEx Growth Rate"
Operating Expenses,Property Insurance,Total Annual,$120000.00,$123000.00,$126075.00,$129226.88,$132457.55,2.50%,"Per unit * Units (Y1), then grows by OpEx Growth Rate"
Operating Expenses,Utilities: Common Area Electric,Total Annual,$30000.00,$30750.00,$31518.75,$32306.70,$33119.37,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Utilities: Water & Sewer,Total Annual,$60000.00,$61500.00,$63037.50,$64613.44,$66228.77,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Utilities: Gas,Total Annual,$15000.00,$15375.00,$15759.38,$16153.36,$16557.69,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Utilities: Trash Removal,Total Annual,$25000.00,$25625.00,$26265.63,$26922.27,$27595.82,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Utilities: Cable/Internet (Common Areas),Total Annual,$10000.00,$10250.00,$10506.25,$10768.81,$11037.93,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Repairs & Maintenance,Total Annual,$180000.00,$184500.00,$189112.50,$193840.31,$198686.32,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Landscaping,Total Annual,$30000.00,$30750.00,$31518.75,$32306.70,$33119.37,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Cleaning,Total Annual,$20000.00,$20500.00,$21012.50,$21537.81,$22076.26,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Security,Total Annual,$25000.00,$25625.00,$26265.63,$26922.27,$27595.82,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Marketing & Advertising,Total Annual,$40000.00,$41000.00,$42025.00,$43075.63,$44152.52,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Payroll: On-site Manager,Total Annual,$75000.00,$76875.00,$78806.25,$80776.41,$82790.87,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Payroll: Leasing Staff,Total Annual,$100000.00,$102500.00,$105062.50,$107688.13,$110379.83,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Payroll: Maintenance Staff,Total Annual,$90000.00,$92250.00,$94556.25,$96925.16,$99348.29,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Administrative Expenses,Total Annual,$25000.00,$25625.00,$26265.63,$26922.27,$27595.82,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Permits & Licenses,Total Annual,$5000.00,$5125.00,$5253.13,$5384.46,$5519.07,2.50%,Grows by OpEx Growth Rate
Operating Expenses,Reserves for Replacement,Total Annual,$90000.00,$92250.00,$94556.25,$96925.16,$99348.29,2.50%,"Per unit reserves * Units (Y1), then grows by OpEx Growth Rate"
Operating Expenses,Total Operating Expenses (OpEx),Total Annual,$2032352.00,$2083457.56,$2135898.31,$2189708.97,$2244924.96,2.51%,Sum of all Operating Expense items
Summary,Net Operating Income (NOI),Total Annual,$4250448.00,$4385586.44,$4524859.61,$4669605.01,$4819771.54,3.18%,GOI - Total Operating Expenses
```