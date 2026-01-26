// services/thinkific/client.js
// Thinkific API統合クライアント

const THINKIFIC_API_KEY = process.env.THINKIFIC_API_KEY;
const THINKIFIC_SUBDOMAIN = process.env.THINKIFIC_SUBDOMAIN || 'cryptotradeacademy';

if (!THINKIFIC_API_KEY) {
  console.warn('[Thinkific] THINKIFIC_API_KEY is not set');
}

const BASE_URL = `https://${THINKIFIC_SUBDOMAIN}.thinkific.com/api/public/v1`;

/**
 * Thinkific APIリクエスト
 */
async function thinkificRequest(method, endpoint, data = null) {
  if (!THINKIFIC_API_KEY) {
    throw new Error('THINKIFIC_API_KEY is not set');
  }

  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'X-Auth-API-Key': THINKIFIC_API_KEY,
      'X-Auth-Subdomain': THINKIFIC_SUBDOMAIN,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Thinkific API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Thinkific] API request failed:', error.message);
    throw error;
  }
}

/**
 * コース一覧を取得
 */
async function getCourses() {
  return thinkificRequest('GET', '/courses');
}

/**
 * コースIDからコース情報を取得
 */
async function getCourseById(courseId) {
  return thinkificRequest('GET', `/courses/${courseId}`);
}

/**
 * コース名からコースIDを取得
 */
async function getCourseIdByName(courseName) {
  const courses = await getCourses();
  const course = courses.items?.find(c => c.name === courseName);
  return course?.id || null;
}

/**
 * コースを作成
 */
async function createCourse(courseData) {
  return thinkificRequest('POST', '/courses', {
    course: courseData,
  });
}

/**
 * コースのセクション一覧を取得
 */
async function getCourseSections(courseId) {
  return thinkificRequest('GET', `/courses/${courseId}/sections`);
}

/**
 * セクション名からセクションIDを取得
 */
async function getSectionIdByName(courseId, sectionName) {
  const sections = await getCourseSections(courseId);
  const section = sections.items?.find(s => s.name === sectionName);
  return section?.id || null;
}

/**
 * セクションを作成
 */
async function createSection(courseId, sectionData) {
  return thinkificRequest('POST', `/courses/${courseId}/sections`, {
    section: sectionData,
  });
}

/**
 * チャプターを作成
 */
async function createChapter(courseId, sectionId, chapterData) {
  return thinkificRequest('POST', `/courses/${courseId}/sections/${sectionId}/chapters`, {
    chapter: chapterData,
  });
}

/**
 * チャプターにコンテンツを追加
 */
async function addChapterContent(courseId, sectionId, chapterId, content) {
  return thinkificRequest('PUT', `/courses/${courseId}/sections/${sectionId}/chapters/${chapterId}`, {
    chapter: {
      content: content,
    },
  });
}

/**
 * チャプターにファイルをアップロード
 */
async function uploadChapterFile(courseId, sectionId, chapterId, fileUrl, fileName) {
  // Thinkific APIでは、ファイルはURL経由でアップロードする必要がある
  // 実際の実装では、ファイルをS3などにアップロードしてからURLを指定
  return thinkificRequest('POST', `/courses/${courseId}/sections/${sectionId}/chapters/${chapterId}/attachments`, {
    attachment: {
      file_url: fileUrl,
      file_name: fileName,
    },
  });
}

/**
 * ユーザーを登録
 */
async function enrollUser(courseId, userId) {
  return thinkificRequest('POST', '/enrollments', {
    enrollment: {
      course_id: courseId,
      user_id: userId,
    },
  });
}

/**
 * ユーザーを作成
 */
async function createUser(userData) {
  return thinkificRequest('POST', '/users', {
    user: userData,
  });
}

/**
 * ユーザーIDを取得（メールアドレスから）
 */
async function getUserIdByEmail(email) {
  // Thinkific APIでは、メールアドレスから直接ユーザーを検索できないため、
  // ユーザー一覧を取得して検索する必要がある
  // 実際の実装では、キャッシュやデータベースを使用することを推奨
  const response = await thinkificRequest('GET', '/users');
  const user = response.items?.find(u => u.email === email);
  return user?.id || null;
}

/**
 * Webhookを設定
 */
async function createWebhook(webhookData) {
  return thinkificRequest('POST', '/webhooks', {
    webhook: webhookData,
  });
}

module.exports = {
  getCourses,
  getCourseById,
  getCourseIdByName,
  createCourse,
  getCourseSections,
  getSectionIdByName,
  createSection,
  createChapter,
  addChapterContent,
  uploadChapterFile,
  enrollUser,
  createUser,
  getUserIdByEmail,
  createWebhook,
};
