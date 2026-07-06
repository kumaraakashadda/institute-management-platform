/**
 * Config.gs  —  Milestone 3 (Fee Management)
 * -----------------------------------------------------------------------
 * REPLACES Milestone 2 Config.gs.
 * Only change vs. M2: CRM_FollowUp_Log added to SCHEMA.
 * Everything else is identical so M2 deployments remain compatible.
 * -----------------------------------------------------------------------
 */

function getScriptProps_() { return PropertiesService.getScriptProperties(); }

function getSpreadsheetId_() {
  var id = getScriptProps_().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID is not set in Script Properties.');
  return id;
}
function getSpreadsheet_() { return SpreadsheetApp.openById(getSpreadsheetId_()); }

function getJwtSecret_() {
  var s = getScriptProps_().getProperty('JWT_SECRET');
  if (!s) throw new Error('JWT_SECRET is not set in Script Properties.');
  return s;
}
function getPasswordPepper_() {
  var p = getScriptProps_().getProperty('PASSWORD_PEPPER');
  if (!p) throw new Error('PASSWORD_PEPPER is not set in Script Properties.');
  return p;
}

var ROLES = {
  SUPER_ADMIN:      'SUPER_ADMIN',
  REGIONAL_MANAGER: 'REGIONAL_MANAGER',
  CENTRE_MANAGER:   'CENTRE_MANAGER',
  TEACHER:          'TEACHER',
  COUNSELLOR:       'COUNSELLOR',
  STUDENT:          'STUDENT',
  PARENT:           'PARENT'
};

var SCHEMA = {
  // ── People & Accounts ───────────────────────────────────────────────────
  Admins:              ['Admin_ID','Full_Name','Phone','Email','Password_Hash','Salt','Status','Created_At'],
  Regional_Managers:   ['RM_ID','Full_Name','Phone','Email','Centres_Assigned','Password_Hash','Salt','Status','Created_At'],
  Managers:            ['Manager_ID','Full_Name','Phone','Email','Centre','Password_Hash','Salt','Status','Created_At'],
  Teachers:            ['Teacher_ID','Full_Name','Phone','Email','Centre','Subjects','Password_Hash','Salt','Status','Created_At'],
  Counsellors:         ['Counsellor_ID','Full_Name','Phone','Email','Centre','Password_Hash','Salt','Status','Created_At'],
  Parents:             ['Parent_ID','Full_Name','Phone','Email','Student_IDs','Password_Hash','Salt','Status','Created_At'],
  Students:            ['Student_ID','Admission_ID','Full_Name','DOB','Gender','Phone','Email','Centre','Course','Batch','Target_Year','Segment','Parent_ID','Portal_Username','Password_Hash','Salt','Must_Reset_Password','QR_Identity','Photo_URL','Status','Created_At','Updated_At'],
  Admission_Master:    ['Admission_ID','Full_Name','DOB','Gender','Phone','Email','Parent_Name','Parent_Phone','Parent_Email','Address','Centre','Course','Batch','Target_Year','Segment','Admission_Date','Counsellor','Registration_Fee_Paid','Status','Created_At','Created_By'],

  // ── Master / Reference Data ─────────────────────────────────────────────
  Centres:             ['Centre_ID','Centre_Name','Address','City','State','Phone','Email','Status','Created_At'],
  Courses:             ['Course_ID','Course_Name','Description','Status'],
  Batches:             ['Batch_ID','Batch_Name','Centre','Course','Target_Year','Segment','Start_Date','End_Date','Status'],
  Subjects:            ['Subject_ID','Subject_Name','Course','Status'],
  Target_Years:        ['Target_Year_ID','Target_Year_Name','Status'],
  Segments:            ['Segment_ID','Segment_Name','Description','Status'],

  // ── Platform Config ─────────────────────────────────────────────────────
  Settings:            ['Setting_Key','Setting_Value','Description','Updated_At','Updated_By'],
  Feature_Flags:       ['Flag_Key','Enabled','Description','Updated_At'],
  Audit_Log:           ['Audit_ID','User_ID','Role','Action','Table_Name','Record_ID','Old_Value','New_Value','Timestamp','IP'],
  System_Logs:         ['Log_ID','Level','Message','Source','Timestamp'],

  // ── Attendance (tables ready; logic = Milestone 4) ───────────────────────
  Attendance_Sessions:    ['Session_ID','Centre','Batch','Course','Subject','Teacher_ID','Classroom','Start_Time','Duration_Minutes','Grace_Minutes','Expiry_Time','QR_Token','Status','Created_At'],
  Attendance_Log:         ['Log_ID','Session_ID','Student_ID','Timestamp','IP','GPS_Lat','GPS_Lng','Device','Browser','OS','Network','Classroom','Status','Created_At'],
  Attendance_Corrections: ['Correction_ID','Session_ID','Student_ID','Original_Status','Corrected_Status','Reason','Approved_By','Timestamp'],
  Student_Devices:        ['Device_ID','Student_ID','Device_Fingerprint','Registered_At','Status'],
  QR_Sessions:            ['QR_Session_ID','Type','Reference_ID','Token','Expiry_Time','Status','Created_At'],
  Leave_Requests:         ['Leave_ID','Student_ID','From_Date','To_Date','Reason','Status','Approved_By','Created_At'],
  Notifications:          ['Notification_ID','Type','Recipient_Role','Recipient_ID','Title','Message','Channel','Status','Created_At','Sent_At'],
  Reports:                ['Report_ID','Report_Type','Generated_By','Parameters','File_URL','Created_At'],

  // ── Fee Management (Milestone 3) ─────────────────────────────────────────
  Fee_Plans:           ['Plan_ID','Plan_Name','Course','Segment','Target_Year','Total_Fee','Registration_Fee','No_Of_Installments','Description','Status'],
  Student_Fees:        ['Student_ID','Student_Name','Admission_ID','Centre','Course','Segment','Target_Year','Fee_Plan','Total_Fee','Discount','Scholarship','Net_Fee','Registration_Fee_Paid','Total_Paid','Pending_Amount','Last_Payment_Date','Payment_Status','Created_Date','Updated_Date'],
  Fee_Installments:    ['Installment_ID','Student_ID','Installment_Number','Due_Date','Installment_Amount','Paid_Amount','Pending_Amount','Payment_Date','Payment_Mode','Transaction_Reference','Status','Remarks'],
  Fee_Payments:        ['Payment_ID','Student_ID','Receipt_Number','Payment_Date','Amount','Payment_Mode','Transaction_ID','Collected_By','Remarks','Receipt_Generated','Timestamp'],
  CRM_FollowUp_Log:    ['Student_ID','Current_Stage','Last_Contacted','Next_Followup_Date','Last_Note','Updated_By','Updated_At']
};

var MASTER_DATA_TABLES    = ['Centres','Courses','Batches','Subjects','Target_Years','Segments'];
var MASTER_DATA_WRITE_ROLES = [ROLES.SUPER_ADMIN];
var ADMISSION_CREATE_ROLES  = [ROLES.SUPER_ADMIN, ROLES.CENTRE_MANAGER, ROLES.COUNSELLOR];
var SETTINGS_WRITE_ROLES    = [ROLES.SUPER_ADMIN];
