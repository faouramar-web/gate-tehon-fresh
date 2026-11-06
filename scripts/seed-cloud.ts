import { db } from '../src/lib/firebase.ts';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function seed() {
  console.log('--- Seeding Firestore and server data ---');

  const schoolId = 'school-1793934341104';
  const schoolData = {
    id: schoolId,
    name: "רב תחומי עמל יאנוח-ג׳ת",
    city: "יאנוח גת",
    code: "SCH-01",
    activationCode: "8181",
    status: "active",
    contactPerson: "תיראן סעיד",
    phone: "0525557368",
    isSuspended: false,
    createdAt: new Date().toISOString()
  };

  // 1. Sync School
  await setDoc(doc(db, 'schools_clean_v6', schoolId), schoolData, { merge: true });
  // Also keep school-1793933627266 mapped or updated in case old link used it
  await setDoc(doc(db, 'schools_clean_v6', 'school-1793933627266'), { ...schoolData, id: 'school-1793933627266' }, { merge: true });
  console.log('✅ School written to Firestore');

  // 2. Staff members
  const staffMembers = [
    {
      id: 'staff-admin-amar',
      staffCode: 'ADMIN',
      fullName: 'עמאר פאעור (מנהל המערכת)',
      role: 'admin',
      pinCode: '160525',
      assignedClasses: ['*'],
      isActive: true,
      schoolId: '*'
    },
    {
      id: 'staff-vp-' + schoolId,
      staffCode: 'VP01',
      fullName: 'תיראן סעיד (סגן מנהל / אחראי שחרורים)',
      role: 'vice_principal',
      pinCode: '3380',
      assignedClasses: ['*'],
      isActive: true,
      schoolId: schoolId,
      phone: '0525557368'
    },
    {
      id: 'staff-guard-' + schoolId,
      staffCode: 'G01',
      fullName: "שומר שער (רב תחומי עמל יאנוח-ג׳ת)",
      role: 'guard',
      pinCode: '2001',
      assignedClasses: [],
      isActive: true,
      schoolId: schoolId
    },
    {
      id: 'staff-arin-barakat',
      staffCode: 'T-ARIN',
      fullName: 'ערין ברכאת',
      role: 'teacher',
      pinCode: '9196',
      assignedClasses: ['י1', '*'],
      isActive: true,
      schoolId: schoolId
    },
    {
      id: 'staff-bisan-khattas',
      staffCode: 'T-BISAN',
      fullName: 'ביסאן גטאס',
      role: 'teacher',
      pinCode: '2021',
      assignedClasses: ['י2'],
      isActive: true,
      schoolId: schoolId
    },
    {
      id: 'staff-katiss-hani',
      staffCode: 'T-KATISS',
      fullName: 'קטיס האני',
      role: 'teacher',
      pinCode: '2022',
      assignedClasses: ['י1'],
      isActive: true,
      schoolId: schoolId
    }
  ];

  for (const st of staffMembers) {
    await setDoc(doc(db, 'staff_clean_v6', st.id), st, { merge: true });
  }
  console.log(`✅ ${staffMembers.length} Staff members written to Firestore`);

  // 3. Students
  const students = [
    {
      id: 's-yanuh-01',
      studentCode: '2-18',
      fullName: 'שהד בריק',
      className: 'י2',
      teacherName: 'ביסאן גטאס',
      schoolId: schoolId,
      notes: ''
    },
    {
      id: 's-yanuh-02',
      studentCode: '2-22',
      fullName: 'מילאן מאלק ביסאן',
      className: 'י2',
      teacherName: 'ביסאן גטאס',
      schoolId: schoolId,
      notes: ''
    },
    {
      id: 's-yanuh-03',
      studentCode: '1-05',
      fullName: "מלאק פרג'",
      className: 'י1',
      teacherName: 'קטיס האני',
      schoolId: schoolId,
      notes: ''
    },
    {
      id: 's-yanuh-04',
      studentCode: '1-08',
      fullName: 'ראמי חטיב',
      className: 'י1',
      teacherName: 'ערין ברכאת',
      schoolId: schoolId,
      notes: ''
    },
    {
      id: 's-yanuh-05',
      studentCode: '1-12',
      fullName: 'נור קבלאן',
      className: 'י1',
      teacherName: 'ערין ברכאת',
      schoolId: schoolId,
      notes: ''
    }
  ];

  for (const s of students) {
    await setDoc(doc(db, 'students_clean_v6', s.id), s, { merge: true });
  }
  console.log(`✅ ${students.length} Students written to Firestore`);

  // 4. Update local data/school_gate.json on server as well
  const jsonPath = path.resolve(process.cwd(), 'data/school_gate.json');
  const serverData = {
    settings: {
      schoolName: "רב תחומי עמל יאנוח-ג׳ת",
      lastUpdated: new Date().toISOString()
    },
    schools: [schoolData],
    activeSchoolId: schoolId,
    staff: staffMembers,
    students: students,
    passes: [],
    auditLogs: []
  };

  fs.writeFileSync(jsonPath, JSON.stringify(serverData, null, 2), 'utf8');
  console.log('✅ Server data/school_gate.json updated synchronously');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding:', err);
  process.exit(1);
});
