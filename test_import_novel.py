import unittest,tempfile
from pathlib import Path
from import_novel import discover_chapters,extract_story,render_story,import_chapters
import hashlib

class ImportNovelTests(unittest.TestCase):
 def test_only_explicit_top_level_chapters_are_selected(self):
  with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as name:
   root=Path(name)
   for file in ['01-第一章.md','02-第二章.md','人物志.md','设定.md','drawgame.zip','01-第一章-备份.md']:(root/file).write_text('正文',encoding='utf8')
   (root/'旧稿归档').mkdir();(root/'旧稿归档/10-第十章.md').write_text('旧稿',encoding='utf8')
   self.assertEqual([p.name for p in discover_chapters(root)],['01-第一章.md','02-第二章.md'])
 def test_notes_are_excluded_but_story_scene_breaks_remain(self):
  title,body=extract_story('# 第九章 先把图拿来\n\n正文一。\n\n---\n\n正文二。\n\n---\n\n### 连续性记录\n秘密设定和下一章计划')
  self.assertEqual(title,'第九章 先把图拿来');self.assertEqual(body,'正文一。\n\n---\n\n正文二。')
 def test_story_without_notes_is_not_cut_at_scene_break(self):
  title,body=extract_story('# 第三章 世纪之末3\r\n\r\n正文。\r\n\r\n---\r\n\r\n结尾。')
  self.assertIn('结尾。',body)
 def test_story_cannot_inject_scripts_images_or_links(self):
  result=render_story('他说：<script>alert(1)</script>\n\n![图](https://example.com/a.png)\n\n---\n\n尾声。')
  self.assertNotIn('<script>',result);self.assertNotIn('<img',result);self.assertNotIn('<a ',result);self.assertIn('<hr',result);self.assertIn('尾声。',result)
 def test_manifest_hash_matches_the_bytes_written_on_this_platform(self):
  with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as name:
   root=Path(name);(root/'source').mkdir();(root/'source/01-第一章.md').write_bytes('# 第一章 标题\r\n\r\n正文。\r\n'.encode('utf8'))
   chapter=import_chapters(root/'source',root/'output')[0]
   self.assertEqual(chapter['publicSha256'],hashlib.sha256((root/'output/01-第一章.md').read_bytes()).hexdigest())

if __name__=='__main__':unittest.main()
