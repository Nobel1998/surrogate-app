import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ApplicationData {
  [key: string]: any;
}

// Helper function to format boolean values
const formatBoolean = (value: any): string => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'N/A';
};

// Helper function to format value or return N/A
const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

export const generateApplicationPDF = (app: ApplicationData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(102, 51, 153); // Purple color
  doc.text('Surrogate Application', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Applicant name and date
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Applicant: ${app.full_name || app.fullName || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Application Date: ${app.created_at ? new Date(app.created_at).toLocaleDateString('en-US') : 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Status: ${app.status ? app.status.toUpperCase() : 'PENDING'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Helper function to add section
  const addSection = (title: string, data: [string, string][], color: [number, number, number] = [102, 51, 153]) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, 14, yPosition);
    yPosition += 3;

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: data,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70, textColor: [80, 80, 80] },
        1: { cellWidth: 'auto', textColor: [0, 0, 0] },
      },
      margin: { left: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  };

  // Step 1: Personal Information
  addSection('Step 1: Personal Information', [
    ['Full Name', formatValue(app.full_name || app.fullName)],
    ['First Name', formatValue(app.firstName)],
    ['Middle Name', formatValue(app.middleName)],
    ['Last Name', formatValue(app.lastName)],
    ['Date of Birth', formatValue(app.dateOfBirth)],
    ['Age', formatValue(app.age)],
    ['Blood Type', formatValue(app.bloodType)],
    ['Height', formatValue(app.height)],
    ['Weight', formatValue(app.weight)],
    ['Race/Ethnicity', formatValue(app.race)],
    ['Religious Background', formatValue(app.religiousBackground)],
    ['US Citizen', formatBoolean(app.usCitizen)],
    ['Citizenship Status', formatValue(app.citizenshipStatus)],
    ['Phone', formatValue(app.phone || app.phoneNumber)],
    ['Email', formatValue(app.email)],
    ['Location/Address', formatValue(app.location)],
    ['How Heard About Us', formatValue(app.hearAboutUs)],
    ['Previous Surrogacy', app.previousSurrogacy === true ? `Yes (${app.previousSurrogacyCount || '?'} times)` : 'No'],
  ], [0, 102, 204]);

  // Step 2: Pregnancy & Delivery History
  const deliveryData: [string, string][] = [
    ['Total Deliveries', formatValue(app.totalDeliveries)],
  ];

  if (app.deliveries && Array.isArray(app.deliveries)) {
    app.deliveries.forEach((delivery: any, index: number) => {
      if (delivery && (delivery.year || delivery.gender || delivery.birthWeight)) {
        deliveryData.push([`Delivery #${index + 1}`, '']);
        deliveryData.push(['  Year', formatValue(delivery.year)]);
        deliveryData.push(['  Gender', formatValue(delivery.gender)]);
        deliveryData.push(['  Birth Weight', formatValue(delivery.birthWeight)]);
        deliveryData.push(['  Gestation Weeks', formatValue(delivery.gestationWeeks)]);
        deliveryData.push(['  Delivery Method', formatValue(delivery.deliveryMethod)]);
        deliveryData.push(['  Conception Method', formatValue(delivery.conceptionMethod)]);
        deliveryData.push(['  Pregnancy Result', formatValue(delivery.pregnancyResult)]);
        deliveryData.push(['  Complications', formatValue(delivery.complications) || 'None']);
      }
    });
  }

  addSection('Step 2: Pregnancy & Delivery History', deliveryData, [219, 112, 147]);

  // Step 3: Health Information
  addSection('Step 3: Health Information', [
    ['Health Insurance', formatBoolean(app.healthInsurance)],
    ['Maternity Coverage', app.maternityCoverage === true ? 'Yes' : app.maternityCoverage === 'not_sure' ? 'Not Sure' : 'No'],
    ['Insurance Details', formatValue(app.insuranceDetails)],
    ['Delivery Hospital', formatValue(app.deliveryHospital)],
    ['Delivered at Hospital Before', formatBoolean(app.deliveredAtHospitalBefore)],
    ['Monthly Cycles', formatBoolean(app.monthlyCycles)],
    ['Cycle Days', formatValue(app.cycleDays)],
    ['Period Days', formatValue(app.periodDays)],
    ['Last Menstrual Period', formatValue(app.lastMenstrualPeriod)],
    ['Smoking Status', formatValue(app.smokingStatus)],
    ['Smoked During Pregnancy', formatBoolean(app.smokedDuringPregnancy)],
    ['Household Smoking', formatBoolean(app.householdSmoking)],
    ['Alcohol Usage', formatValue(app.alcoholUsage)],
    ['Alcohol Frequency', formatValue(app.alcoholFrequency)],
    ['Illegal Drugs', formatBoolean(app.illegalDrugs)],
    ['Partner Illegal Drugs', formatBoolean(app.partnerIllegalDrugs)],
    ['Children List', formatValue(app.childrenList)],
    ['Surgeries', app.surgeries === true ? `Yes - ${app.surgeryDetails || 'N/A'}` : 'No'],
    ['Serious Illnesses', formatValue(app.seriousIllnesses)],
    ['Hospitalizations', formatValue(app.hospitalizations)],
    ['Current Medications', formatValue(app.currentMedications)],
    ['Mental Health Treatment', formatBoolean(app.mentalHealthTreatment)],
    ['Mental Health Details', formatValue(app.mentalHealthDetails)],
    ['Postpartum Depression', formatBoolean(app.postpartumDepression)],
    ['Postpartum Details', formatValue(app.postpartumDepressionDetails)],
    ['Hepatitis B Vaccinated', formatBoolean(app.hepatitisBVaccinated)],
    ['Allergies', app.allergies === true ? `Yes - ${app.allergiesDetails || 'N/A'}` : 'No'],
  ], [34, 139, 34]);

  // Step 4: Sexual History
  addSection('Step 4: Sexual History', [
    ['Past Contraceptives', formatValue(app.pastContraceptives)],
    ['Current Birth Control', formatBoolean(app.currentBirthControl)],
    ['Birth Control Method', formatValue(app.birthControlMethod)],
    ['Birth Control Duration', formatValue(app.birthControlDuration)],
    ['Sexual Partner', formatBoolean(app.sexualPartner)],
    ['Multiple Partners', formatBoolean(app.multiplePartners)],
    ['Partners (Last 3 Years)', formatValue(app.partnersLastThreeYears)],
    ['High Risk HIV Contact', formatBoolean(app.highRiskHIVContact)],
    ['HIV Risk', formatBoolean(app.hivRisk)],
    ['Blood Transfusion', formatBoolean(app.bloodTransfusion)],
    ['STD History', app.stdHistory === true ? `Yes - ${app.stdDetails || 'N/A'}` : 'No'],
  ], [148, 103, 189]);

  // Step 5: Employment Information
  addSection('Step 5: Employment Information', [
    ['Current Employment', formatValue(app.currentEmployment)],
    ['Monthly Income', app.monthlyIncome ? `$${app.monthlyIncome}` : 'N/A'],
    ['Spouse Employment', formatValue(app.spouseEmployment)],
    ['Spouse Monthly Income', app.spouseMonthlyIncome ? `$${app.spouseMonthlyIncome}` : 'N/A'],
    ['Persons Supported', formatValue(app.personsSupported)],
    ['Public Assistance', formatBoolean(app.publicAssistance)],
    ['Household Members', formatValue(app.householdMembers)],
  ], [218, 165, 32]);

  // Step 6: Education
  addSection('Step 6: Education', [
    ['Education Level', app.educationLevel === 'highSchool' ? 'High School' : app.educationLevel === 'college' ? 'College' : app.educationLevel === 'tradeSchool' ? 'Trade School' : formatValue(app.educationLevel)],
    ['Trade School Details', formatValue(app.tradeSchoolDetails)],
    ['Referral Code', formatValue(app.referralCode)],
  ], [75, 0, 130]);

  // Step 7: General Questions & Preferences
  addSection('Step 7: General Questions & Preferences', [
    ['Surrogacy Understanding', formatValue(app.surrogacyUnderstanding)],
    ['Self Introduction', formatValue(app.selfIntroduction)],
    ['Expected Support', formatValue(app.expectedSupport)],
    ['Partner Feelings', formatValue(app.partnerFeelings)],
    ['Work with Same Sex Couple', formatBoolean(app.sameSexCouple)],
    ['Work with Single Male', formatBoolean(app.singleMale)],
    ['Work with Single Female', formatBoolean(app.singleFemale)],
    ['Work with International Couple', formatBoolean(app.internationalCouple)],
    ['Carry Twins', formatBoolean(app.carryTwins)],
    ['Receive Injections', formatBoolean(app.receiveInjections)],
    ['Attend Checkups', formatBoolean(app.attendCheckups)],
    ['Avoid Long Travel', formatBoolean(app.avoidLongTravel)],
    ['Parents in Delivery Room', formatBoolean(app.parentsInDeliveryRoom)],
    ['Parents at Appointments', formatBoolean(app.parentsAtAppointments)],
    ['Contact During Process', formatValue(app.contactDuringProcess)],
    ['Contact After Birth', formatValue(app.contactAfterBirth)],
  ], [255, 140, 0]);

  // Step 8: Authorization
  addSection('Step 8: Authorization', [
    ['Authorization Agreed', app.authorizationAgreed === true ? 'Yes - Agreed' : 'Not Agreed'],
    ['Emergency Contact', formatValue(app.emergencyContact)],
  ], [220, 20, 60]);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString('en-US')} | Babytree Surrogacy`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `Surrogate_Application_${(app.full_name || app.fullName || 'Unknown').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

