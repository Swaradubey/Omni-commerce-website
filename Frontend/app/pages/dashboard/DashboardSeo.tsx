import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

/** Placeholder SEO workspace until dedicated SEO tooling is wired to the API. */
export function DashboardSeo() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
          <Search className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">SEO</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">SEO manager</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Meta tags, search visibility, and content optimization tools will appear here.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
          <CardDescription>This panel is reserved for SEO workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No backend routes were removed or changed. Access is limited to authorized staff accounts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
