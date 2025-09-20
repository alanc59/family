--
-- CREATE TABLES
--

DROP TABLE IF EXISTS `marriage`;
DROP TABLE IF EXISTS `parent_child`;
DROP TABLE IF EXISTS `person`;

CREATE TABLE `person` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `deathdate` date DEFAULT NULL,
  `biography` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `parent_child` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL,
  `child_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  KEY `child_id` (`child_id`),
  CONSTRAINT `parent_child_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `person` (`id`),
  CONSTRAINT `parent_child_ibfk_2` FOREIGN KEY (`child_id`) REFERENCES `person` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `marriage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `person1_id` int NOT NULL,
  `person2_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `person1_id` (`person1_id`),
  KEY `person2_id` (`person2_id`),
  CONSTRAINT `marriage_ibfk_1` FOREIGN KEY (`person1_id`) REFERENCES `person` (`id`),
  CONSTRAINT `marriage_ibfk_2` FOREIGN KEY (`person2_id`) REFERENCES `person` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Upload data
--

INSERT INTO `person` VALUES (1, 'George','1936-04-25','1999-12-31','George was a bricklayer by trade.');
INSERT INTO `person` VALUES (2, 'Joan','1937-11-10',NULL,'Joan raised five children and loves reading.');
INSERT INTO `person` VALUES (3, 'Alan','1959-10-10',NULL,'Alan was a IT Architect');
INSERT INTO `person` VALUES (4, 'Jackie','1960-05-06',NULL,'Jackie has a doctorate and taught Nursing at Manchester University');
INSERT INTO `person` VALUES (5, 'Robert','1964-06-26','2015-06-06','Robert was the life and soul of the party');
INSERT INTO `person` VALUES (6, 'Elaine','1966-02-02',NULL,'Elaine works in a hospital.');
INSERT INTO `person` VALUES (7, 'Gillian','1968-06-03',NULL,'Gillian works in a hospital.');
INSERT INTO `person` VALUES (8, 'Edward','1971-05-05',NULL,'Edward is a research chemist');
INSERT INTO `person` VALUES (9, 'Sean','1993-07-19',NULL,'Sean has a doctorate in Maths and works in IT');
INSERT INTO `person` VALUES (10, 'GeorgeF','1915-01-01','1981-01-01','Bricklayer');
INSERT INTO `person` VALUES (11, 'Fanny','1885-01-01','1961-01-01','Housewife');
INSERT INTO `person` VALUES (12, 'Elsie','1916-01-01','1989-01-01','Housewife');
INSERT INTO `person` VALUES (13, 'Mark','1885-01-01','1940-01-01','Baker');
INSERT INTO `person` VALUES (14, 'Severtus','1806-01-01','1905-01-01','Seaman');
INSERT INTO `person` VALUES (15, 'SevertusWife','1806-01-01','1935-01-01','Hotel Manager');
INSERT INTO `person` VALUES (16, 'Grace','1938-01-01',NULL,'Social Worker.');
INSERT INTO `person` VALUES (17, 'John','1860-01-01','1940-12-31','Middle name Wesley, John was a preacher');
INSERT INTO `person` VALUES (18, 'Eleanor','1860-01-01','1940-12-31','Housewife');

INSERT INTO `marriage` VALUES (1,14,15),(2,13,11),(3,10,12),(4,1,2),(5,3,4);
INSERT INTO `marriage` VALUES (6, (SELECT id FROM person WHERE name = "John"),(SELECT id FROM person WHERE name = "Eleanor"));

INSERT INTO `parent_child` VALUES (1,14,11),(2,15,11),(3,13,10),(4,11,10),(5,10,1),(6,12,1),(7,10,16),(8,12,16),(9,1,3),(10,2,3),(11,1,5),(12,2,5),(13,1,6),(14,2,6),(15,1,7),(16,2,7),(17,1,8),(18,2,8),(19,3,9),(20,4,9);
INSERT INTO `parent_child` VALUES (21, (SELECT id FROM person WHERE name = "John"),(SELECT id FROM person WHERE name = "Mark"));
INSERT INTO `parent_child` VALUES (22, (SELECT id FROM person WHERE name = "Eleanor"),(SELECT id FROM person WHERE name = "Mark"));
