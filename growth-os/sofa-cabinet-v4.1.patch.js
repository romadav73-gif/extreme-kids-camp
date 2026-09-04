// SOFA65_CLEANUP_V4_1_START
// V3 stored the previous Sofia home function in renderManager by reference.
// Rebind after the V4 home implementation so the cleaned action-first dashboard is actually rendered.
// Production QA trigger: 2026-09-04.
renderManager=sofa65ManagerHome;
// SOFA65_CLEANUP_V4_1_END
