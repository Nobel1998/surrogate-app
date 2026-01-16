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

// Helper function to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

export const generateApplicationPDF = async (app: ApplicationData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Check application type
  const isIntendedParent = app.applicationType === 'intended_parent';

  // Title
  doc.setFontSize(20);
  doc.setTextColor(102, 51, 153); // Purple color
  doc.text(isIntendedParent ? 'Intended Parent Application' : 'Surrogate Application', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Applicant name and date
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Applicant: ${app.full_name || app.fullName || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  const applicationDate = app.submitted_at || app.created_at;
  doc.text(`Application Date: ${applicationDate ? new Date(applicationDate).toLocaleDateString('en-US') : 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
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

  // Generate different PDF based on application type
  if (isIntendedParent) {
    // Intended Parent Application PDF
    // Step 1: Family Structure & Basic Information
    addSection('Step 1: Family Structure & Basic Information', [
      ['Family Structure', formatValue(app.familyStructure)],
      ['How Did You Hear About Us', formatValue(app.hearAboutUs)],
    ], [0, 102, 204]);

    // Intended Parent 1
    addSection('Intended Parent 1', [
      ['First Name', formatValue(app.parent1FirstName)],
      ['Last Name', formatValue(app.parent1LastName)],
      ['Date of Birth', app.parent1DateOfBirthMonth && app.parent1DateOfBirthDay && app.parent1DateOfBirthYear
        ? `${app.parent1DateOfBirthMonth}/${app.parent1DateOfBirthDay}/${app.parent1DateOfBirthYear}`
        : 'N/A'],
      ['Gender', formatValue(app.parent1Gender)],
      ['Blood Type', formatValue(app.parent1BloodType)],
      ['Citizenship', formatValue(app.parent1Citizenship)],
      ['Country/State of Residence', formatValue(app.parent1CountryState)],
      ['Occupation', formatValue(app.parent1Occupation)],
      ['Languages', formatValue(app.parent1Languages)],
      ['Phone', app.parent1PhoneCountryCode && app.parent1PhoneAreaCode && app.parent1PhoneNumber
        ? `+${app.parent1PhoneCountryCode} (${app.parent1PhoneAreaCode}) ${app.parent1PhoneNumber}`
        : formatValue(app.parent1PhoneNumber)],
      ['Email', formatValue(app.parent1Email)],
      ['Emergency Contact', formatValue(app.parent1EmergencyContact)],
      ['Address', [
        app.parent1AddressStreet,
        app.parent1AddressStreet2,
        app.parent1AddressCity,
        app.parent1AddressState,
        app.parent1AddressZip
      ].filter(Boolean).join(', ') || 'N/A'],
    ], [34, 139, 34]);

    // Intended Parent 2 (if applicable)
    if (app.parent2FirstName || app.parent2LastName) {
      addSection('Intended Parent 2', [
        ['First Name', formatValue(app.parent2FirstName)],
        ['Last Name', formatValue(app.parent2LastName)],
        ['Date of Birth', app.parent2DateOfBirthMonth && app.parent2DateOfBirthDay && app.parent2DateOfBirthYear
          ? `${app.parent2DateOfBirthMonth}/${app.parent2DateOfBirthDay}/${app.parent2DateOfBirthYear}`
          : 'N/A'],
        ['Gender', formatValue(app.parent2Gender)],
        ['Blood Type', formatValue(app.parent2BloodType)],
        ['Citizenship', formatValue(app.parent2Citizenship)],
        ['Country/State of Residence', formatValue(app.parent2CountryState)],
        ['Occupation', formatValue(app.parent2Occupation)],
        ['Languages', formatValue(app.parent2Languages)],
        ['Phone', app.parent2PhoneCountryCode && app.parent2PhoneAreaCode && app.parent2PhoneNumber
          ? `+${app.parent2PhoneCountryCode} (${app.parent2PhoneAreaCode}) ${app.parent2PhoneNumber}`
          : formatValue(app.parent2PhoneNumber)],
        ['Email', formatValue(app.parent2Email)],
      ], [75, 0, 130]);
    }

    // Step 3: Family Background
    addSection('Step 3: Family Background', [
      ['How Long Have You Been Together', formatValue(app.howLongTogether)],
      ['Do You Have Any Children', formatBoolean(app.haveChildren)],
      ['Children Details', formatValue(app.childrenDetails)],
    ], [219, 112, 147]);

    // Step 4: Medical & Fertility History
    addSection('Step 4: Medical & Fertility History', [
      ['Reason for Pursuing Surrogacy', Array.isArray(app.reasonForSurrogacy) 
        ? app.reasonForSurrogacy.join(', ') 
        : formatValue(app.reasonForSurrogacy)],
      ['Have You Undergone IVF', formatBoolean(app.undergoneIVF)],
      ['Do You Need Donor Eggs', formatBoolean(app.needDonorEggs)],
      ['Do You Need Donor Sperm', formatBoolean(app.needDonorSperm)],
      ['Do You Currently Have Embryos', formatBoolean(app.haveEmbryos)],
      ['Number of Embryos', formatValue(app.numberOfEmbryos)],
      ['PGT-A Tested', formatBoolean(app.pgtATested)],
      ['Embryo Development Day', formatValue(app.embryoDevelopmentDay)],
      ['Frozen at Which Clinic', formatValue(app.frozenAtClinic)],
      ['Clinic Email', formatValue(app.clinicEmail)],
      ['Fertility Doctor Name', formatValue(app.fertilityDoctorName)],
      ['HIV/Hepatitis/STD Status', formatValue(app.hivHepatitisStdStatus)],
    ], [34, 139, 34]);

    // Step 5: Surrogate Preferences
    addSection('Step 5: Surrogate Preferences', [
      ['Preferred Surrogate Age Range', formatValue(app.preferredSurrogateAgeRange)],
      ['Surrogate Location Preference', formatValue(app.surrogateLocationPreference)],
      ['Specific States', formatValue(app.specificStates)],
      ['Accept Surrogate with Previous C-sections', formatBoolean(app.acceptPreviousCsection)],
      ['Prefer Surrogate Who Does Not Work During Pregnancy', formatBoolean(app.preferNoWorkDuringPregnancy)],
      ['Prefer Surrogate with Stable Home Environment', formatBoolean(app.preferStableHome)],
      ['Prefer Surrogate with Flexible Schedule', formatBoolean(app.preferFlexibleSchedule)],
      ['Do You Have Diet Preference During Pregnancy', formatBoolean(app.dietPreferenceYes)],
      ['Diet Preference', formatValue(app.dietPreference)],
      ['Communication Preferences', Array.isArray(app.communicationPreference)
        ? app.communicationPreference.join(', ')
        : formatValue(app.communicationPreference)],
      ['Relationship Style With Surrogate', Array.isArray(app.relationshipStyle)
        ? app.relationshipStyle.join(', ')
        : formatValue(app.relationshipStyle)],
      ['Prefer Surrogate to Follow Specific OB/GYN Guidelines', formatBoolean(app.preferSpecificObGynGuidelines)],
    ], [148, 103, 189]);

    // Step 6: Additional Surrogate Preferences
    addSection('Step 6: Additional Surrogate Preferences', [
      ['Prefer Surrogate to Avoid Heavy Lifting', formatBoolean(app.preferAvoidHeavyLifting)],
      ['Prefer Surrogate to Avoid Travel During Pregnancy', formatBoolean(app.preferAvoidTravel)],
      ['Comfortable with Surrogate Delivering in Her Local Hospital', formatBoolean(app.comfortableWithLocalHospital)],
      ['Prefer Surrogate Who is Open to Selective Reduction', formatBoolean(app.preferOpenToSelectiveReduction)],
      ['Prefer Surrogate Who is Open to Termination for Medical Reasons', formatBoolean(app.preferOpenToTerminationMedical)],
      ['Prefer Surrogate with Previous Surrogacy Experience', formatValue(app.preferPreviousSurrogacyExperience)],
      ['Prefer Surrogate with Strong Support System', formatBoolean(app.preferStrongSupportSystem)],
      ['Prefer Surrogate Who is Married', formatValue(app.preferMarried)],
      ['Prefer Surrogate with Stable Income', formatBoolean(app.preferStableIncome)],
      ['Prefer Surrogate Who is Comfortable with Intended Parents Attending Appointments', formatValue(app.preferComfortableWithAppointments)],
      ['Prefer Surrogate Who is Comfortable with Intended Parents Being Present at Birth', formatValue(app.preferComfortableWithBirth)],
    ], [218, 165, 32]);

    // Step 7: General Questions
    addSection('Step 7: General Questions', [
      ['Will You Transfer More Than One Embryo', formatBoolean(app.willTransferMoreThanOneEmbryo)],
      ['Attorney Name', formatValue(app.attorneyName)],
      ['Attorney Email', formatValue(app.attorneyEmail)],
      ['Do You Have a Translator', formatBoolean(app.haveTranslator)],
      ['Translator Name', formatValue(app.translatorName)],
      ['Translator Email', formatValue(app.translatorEmail)],
      ['Are You Prepared for the Possibility of a Failed Embryo Transfer', formatBoolean(app.preparedForFailedTransfer)],
      ['Are You Willing to Attempt Multiple Cycles if Needed', formatBoolean(app.willingToAttemptMultipleCycles)],
      ['Are You Emotionally Prepared for the Full Surrogacy Journey', formatBoolean(app.emotionallyPrepared)],
      ['Are You Able to Handle Potential Delays or Medical Risks', formatBoolean(app.ableToHandleDelaysOrRisks)],
    ], [255, 140, 0]);

    // Step 8: Letter to Surrogate
    addSection('Step 8: Letter to Surrogate', [
      ['Letter to Surrogate', formatValue(app.letterToSurrogate)],
    ], [220, 20, 60]);

  } else {
    // Surrogate Application PDF
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
    ['Practicing Religion', formatBoolean(app.practicingReligion)],
    ['US Citizen', formatBoolean(app.usCitizen)],
    ['Citizenship Status', formatValue(app.citizenshipStatus)],
    ['Phone', formatValue(app.phone || app.phoneNumber)],
    ['Email', formatValue(app.email)],
    ['Full Address', formatValue(app.address || app.applicantAddress || app.location)],
    ['How Heard About Us', formatValue(app.hearAboutUs)],
    ['Referral Code', formatValue(app.referralCode)],
    ['Siblings Count', formatValue(app.siblingsCount)],
    ['Mother Siblings Count', formatValue(app.motherSiblingsCount)],
    ['Pets', formatValue(app.pets)],
    ['Living Situation', formatValue(app.livingSituation)],
    ['Own Car', formatBoolean(app.ownCar)],
    ['Driver License', formatBoolean(app.driverLicense)],
    ['Car Insured', formatBoolean(app.carInsured)],
    ['Transportation Method', formatValue(app.transportationMethod)],
    ['Nearest Airport', formatValue(app.nearestAirport)],
    ['Airport Distance', formatValue(app.airportDistance)],
    ['Legal Problems', formatValue(app.legalProblems)],
    ['Jail Time', formatValue(app.jailTime)],
    ['Want More Children', formatBoolean(app.wantMoreChildren)],
    ['Previous Surrogacy', app.previousSurrogacy === true ? `Yes (${app.previousSurrogacyCount || '?'} times)` : 'No'],
  ], [0, 102, 204]);

  // Marital Status & Family
  addSection('Marital Status & Family', [
    ['Marital Status', formatValue(app.maritalStatus)],
    ['Are you single?', app.isSingle === true ? 'Yes' : app.isSingle === false ? 'No' : 'N/A'],
    ['Are you married?', app.isMarried === true ? 'Yes' : app.isMarried === false ? 'No' : 'N/A'],
    ['Are you widowed?', app.isWidowed === true ? 'Yes' : app.isWidowed === false ? 'No' : 'N/A'],
    ['Life Partner', formatBoolean(app.lifePartner)],
    ['Engaged', formatBoolean(app.engaged)],
    ['Spouse/Partner Name', formatValue(app.spouseName || app.partnerName)],
    ['Spouse/Partner Date of Birth', formatValue(app.spouseDateOfBirth || app.partnerDateOfBirth)],
    ['Marriage Date', formatValue(app.marriageDate)],
    ['Wedding Date', formatValue(app.weddingDate)],
    ['Widowed Date', formatValue(app.widowedDate)],
    ['Marital Problems', formatValue(app.maritalProblems)],
    ['Divorced', formatBoolean(app.divorced)],
    ['Divorce Date', formatValue(app.divorceDate)],
    ['Divorce Cause', formatValue(app.divorceCause)],
    ['Remarried', formatBoolean(app.remarried)],
    ['Remarried Date', formatValue(app.remarriedDate)],
    ['Legally Separated', formatBoolean(app.legallySeparated)],
    ['Separation Details', formatValue(app.separationDetails)],
    ['Engagement Date', formatValue(app.engagementDate)],
  ], [219, 112, 147]);

  // Step 2: Pregnancy & Delivery History
  const deliveryData: [string, string][] = [
    ['Total Deliveries', formatValue(app.totalDeliveries)],
    ['Previous Surrogacy', app.previousSurrogacy === true ? `Yes (${app.previousSurrogacyCount || '?'} times)` : 'No'],
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
    ['State Agency Insurance', formatBoolean(app.stateAgencyInsurance)],
    ['State Agency Name', formatValue(app.stateAgencyName)],
    ['Insurance Payment Method', formatValue(app.insurancePaymentMethod)],
    ['Delivery Hospital', formatValue(app.deliveryHospital)],
    ['Delivered at Hospital Before', formatBoolean(app.deliveredAtHospitalBefore)],
    ['Abnormal Pap Smear', formatBoolean(app.abnormalPapSmear)],
    ['Monthly Cycles', formatBoolean(app.monthlyCycles)],
    ['Cycle Days', formatValue(app.cycleDays)],
    ['Period Days', formatValue(app.periodDays)],
    ['Last Menstrual Period', formatValue(app.lastMenstrualPeriod)],
    ['Infertility Doctor', formatBoolean(app.infertilityDoctor)],
    ['Infertility Details', formatValue(app.infertilityDetails)],
    ['Household Marijuana Use', formatBoolean(app.householdMarijuana)],
    ['Pregnancy Problems', formatBoolean(app.pregnancyProblems)],
    ['Pregnancy Problems Details', formatValue(app.pregnancyProblemsDetails)],
    ['Children Health Problems', formatBoolean(app.childrenHealthProblems)],
    ['Children Health Details', formatValue(app.childrenHealthDetails)],
    ['Currently Breastfeeding', formatBoolean(app.breastfeeding)],
    ['Breastfeeding Stop Date', formatValue(app.breastfeedingStopDate)],
    ['Tattoos/Piercings (Last 1.5 years)', formatBoolean(app.tattoosPiercings)],
    ['Tattoos/Piercings Date', formatValue(app.tattoosPiercingsDate)],
    ['Depression Medication', formatBoolean(app.depressionMedication)],
    ['Depression Medication Details', formatValue(app.depressionMedicationDetails)],
    ['Drug/Alcohol Abuse', formatBoolean(app.drugAlcoholAbuse)],
    ['Excess Heat Exposure', formatBoolean(app.excessHeat)],
    ['Alcohol Limit Advised', formatBoolean(app.alcoholLimitAdvised)],
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
    ['STD History', formatBoolean(app.stdHistory)],
    ['STD Details', formatValue(app.stdDetails)],
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
  ], [75, 0, 130]);

  // Step 7: General Questions & Preferences
  addSection('Step 7: General Questions & Preferences', [
    ['Surrogacy Understanding', formatValue(app.surrogacyUnderstanding)],
    ['Self Introduction', formatValue(app.selfIntroduction)],
    ['Main Concerns', Array.isArray(app.mainConcerns) ? app.mainConcerns.join(', ') : formatValue(app.mainConcerns)],
    ['Parent Qualities', formatValue(app.parentQualities)],
    ['Religious Background Preference', formatBoolean(app.religiousPreference)],
    ['Work with Unmarried Couple', formatBoolean(app.unmarriedCouple)],
    ['Work with Heterosexual Couple', formatBoolean(app.heterosexualCouple)],
    ['Work with Same Sex Couple', formatBoolean(app.sameSexCouple)],
    ['Work with Single Male', formatBoolean(app.singleMale)],
    ['Work with Single Female', formatBoolean(app.singleFemale)],
    ['Work with Egg Donor', formatBoolean(app.eggDonor)],
    ['Work with Sperm Donor', formatBoolean(app.spermDonor)],
    ['Work with Older Couple', formatBoolean(app.olderCouple)],
    ['Work with Couple with Children', formatBoolean(app.coupleWithChildren)],
    ['Work with International Couple', formatBoolean(app.internationalCouple)],
    ['Work with Non-English Speaking Couple', formatBoolean(app.nonEnglishSpeaking)],
    ['Willing to Carry Twins', formatBoolean(app.carryTwins)],
    ['Willing to Reduce Multiples', formatBoolean(app.reduceMultiples)],
    ['Willing to Undergo Amniocentesis', formatBoolean(app.amniocentesis)],
    ['Willing to Abort for Birth Defects', formatBoolean(app.abortBirthDefects)],
    ['Contact During Process', formatValue(app.contactDuringProcess)],
    ['Contact After Birth', formatValue(app.contactAfterBirth)],
    ['Concerns About Placing Baby', formatBoolean(app.concernsPlacingBaby)],
    ['Permit Parents in Delivery Room', formatBoolean(app.parentsInDeliveryRoom)],
    ['Permit Parents at Doctor Appointments', formatBoolean(app.parentsAtAppointments)],
    ['Permit Hospital Notification', formatBoolean(app.hospitalNotification)],
    ['Allow Parents Names on Birth Certificate', formatBoolean(app.parentsOnBirthCertificate)],
    ['Currently Applying Elsewhere', formatBoolean(app.applyingElsewhere)],
    ['Previously Rejected Elsewhere', formatBoolean(app.previouslyRejected)],
    ['Able to Attend Prenatal Check-ups', formatBoolean(app.attendPrenatalCheckups)],
    ['Willing to Undergo Medical Examinations', formatBoolean(app.medicalExaminations)],
    ['Able to Follow Lifestyle Guidelines', formatBoolean(app.lifestyleGuidelines)],
    ['Willing to Avoid Long-distance Travel', formatBoolean(app.avoidLongTravel)],
    ['Willing to Refrain from High-risk Work', formatBoolean(app.refrainHighRiskWork)],
    ['Placed Child for Adoption', formatBoolean(app.placedForAdoption)],
    ['Expected Support', formatValue(app.expectedSupport)],
    ['Non-supportive People', formatBoolean(app.nonSupportivePeople)],
    ['Husband/Partner Feelings', formatValue(app.partnerFeelings)],
    ['Adequate Child Care Support', formatBoolean(app.childCareSupport)],
  ], [255, 140, 0]);

  // Step 8: Authorization
  const authorizationData: [string, string][] = [
    ['Authorization Agreed', app.authorizationAgreed === true ? 'Yes - Agreed' : 'Not Agreed'],
    ['Applicant Address', formatValue(app.applicantAddress)],
    ['Emergency Contact', formatValue(app.emergencyContact)],
    ['Referral Code', formatValue(app.referralCode)],
  ];

  addSection('Step 8: Authorization', authorizationData, [220, 20, 60]);

  // Add lifestyle photos section with embedded images
  if (app.photos && Array.isArray(app.photos) && app.photos.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(220, 20, 60);
    doc.text('Lifestyle Photos', 14, yPosition);
    yPosition += 8;

    const photosPerRow = 2;
    const photoWidth = (pageWidth - 40) / photosPerRow;
    const photoHeight = 60;
    const spacing = 10;

    for (let i = 0; i < app.photos.length; i++) {
      const photoUrl = app.photos[i];
      if (!photoUrl) continue;

      // Check if we need a new page
      if (yPosition + photoHeight > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPosition = 20;
      }

      const col = i % photosPerRow;
      const row = Math.floor(i / photosPerRow);
      const x = 14 + col * (photoWidth + spacing);
      const y = yPosition + row * (photoHeight + 25);

      try {
        // Try to load and embed the image
        const base64Image = await loadImageAsBase64(photoUrl);
        if (base64Image) {
          doc.addImage(base64Image, 'JPEG', x, y, photoWidth, photoHeight);
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`Photo ${i + 1}`, x + photoWidth / 2, y + photoHeight + 5, { align: 'center' });
        } else {
          // If image can't be loaded, show URL as text
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 255);
          doc.text(`Photo ${i + 1}: ${photoUrl}`, x, y + photoHeight / 2, { maxWidth: photoWidth });
        }
      } catch (error) {
        // If error, show URL as text
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 255);
        doc.text(`Photo ${i + 1}: ${photoUrl}`, x, y + photoHeight / 2, { maxWidth: photoWidth });
      }
    }

    // Update yPosition after photos
    const totalRows = Math.ceil(app.photos.length / photosPerRow);
    yPosition += totalRows * (photoHeight + 25) + 10;
  } else if (app.photoUrl) {
    // Backward compatibility: single photo
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(220, 20, 60);
    doc.text('Surrogate Photo', 14, yPosition);
    yPosition += 8;

    const photoWidth = pageWidth - 40;
    const photoHeight = 100;

    try {
      const base64Image = await loadImageAsBase64(app.photoUrl);
      if (base64Image) {
        doc.addImage(base64Image, 'JPEG', 14, yPosition, photoWidth, photoHeight);
        yPosition += photoHeight + 10;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 255);
        doc.text(`Photo URL: ${app.photoUrl}`, 14, yPosition, { maxWidth: photoWidth });
        yPosition += 15;
      }
    } catch (error) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 255);
      doc.text(`Photo URL: ${app.photoUrl}`, 14, yPosition, { maxWidth: photoWidth });
      yPosition += 15;
    }
  }
  }

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
  const appType = isIntendedParent ? 'Intended_Parent' : 'Surrogate';
  const fileName = `${appType}_Application_${(app.full_name || app.fullName || 'Unknown').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

